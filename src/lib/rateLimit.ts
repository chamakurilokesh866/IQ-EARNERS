import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { headers } from "next/headers"

/**
 * Rate limiter for API routes.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory store otherwise (single-instance only).
 *
 * Uses `headers()` from next/headers (not `request.headers`) so route handlers are not
 * misclassified as static during build / RSC analysis (avoids Dynamic server usage errors).
 */

async function getClientKey(prefix: string): Promise<string> {
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")
  const realIp = h.get("x-real-ip")
  const ip = (forwarded?.split(",")[0]?.trim() || realIp || "unknown").slice(0, 64)
  return `${prefix}:${ip}`
}

export type RateLimitConfig = {
  windowMs: number
  max: number
}

export const PRESETS: Record<string, RateLimitConfig> = {
  login: { windowMs: 60_000, max: 8 },
  adminLogin: { windowMs: 60_000, max: 5 },
  mockExamGenerate: { windowMs: 5 * 60_000, max: 6 },
  aiGenerate: { windowMs: 60_000, max: 15 },
  integrity: { windowMs: 60_000, max: 30 },
  feedback: { windowMs: 60_000, max: 10 },
  referral: { windowMs: 60_000, max: 20 },
  payment: { windowMs: 60_000, max: 10 },
  api: { windowMs: 60_000, max: 100 },
  security: { windowMs: 60_000, max: 15 },
  checkUsername: { windowMs: 60_000, max: 30 },
  createUsernameRequestOtp: { windowMs: 15 * 60_000, max: 5 },
  createUsernameVerifyOtp: { windowMs: 5 * 60_000, max: 10 },
  forgotPasswordRequest: { windowMs: 15 * 60_000, max: 3 },
  forgotPasswordVerify: { windowMs: 5 * 60_000, max: 10 },
  forgotPasswordReset: { windowMs: 15 * 60_000, max: 5 },
}

// ── In-memory fallback (used if Redis is unavailable) ──────────────────────
const store = new Map<string, { count: number; resetAt: number }>()
const CLEANUP_INTERVAL_MS = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, v] of store.entries()) {
    if (v.resetAt < now) store.delete(key)
  }
}

async function rateLimitMemory(
  preset: keyof typeof PRESETS
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  cleanup()
  const config = PRESETS[preset] ?? PRESETS.api
  const key = await getClientKey(preset)
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { ok: true }
  }

  if (now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { ok: true }
  }

  if (entry.count >= config.max) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { ok: true }
}

// ── Upstash Redis Initialization ───────────────────────────────────────────
type LimiterInstance = { limit: (id: string) => Promise<{ success: boolean; reset: number; remaining: number }> }
let globalRedisClient: Redis | null = null
let redisLimiters: Record<string, LimiterInstance> | null = null

function getRedisLimiters(): Record<string, LimiterInstance> | null {
  if (redisLimiters) return redisLimiters
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  try {
    if (!globalRedisClient) {
      globalRedisClient = new Redis({ url, token })
    }

    const limiters: Record<string, LimiterInstance> = {}
    for (const [name, cfg] of Object.entries(PRESETS)) {
      const windowSec = Math.ceil(cfg.windowMs / 1000)
      limiters[name] = new Ratelimit({
        redis: globalRedisClient,
        limiter: Ratelimit.fixedWindow(cfg.max, `${windowSec} s`),
        prefix: `rl:${name}`,
        ephemeralCache: new Map(), // optimize performance
      })
    }
    redisLimiters = limiters
    return limiters
  } catch (err) {
    console.error("[rateLimit] Redis init failed:", err)
    return null
  }
}

async function rateLimitRedis(
  preset: keyof typeof PRESETS
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const limiters = getRedisLimiters()
  if (!limiters) return rateLimitMemory(preset)

  try {
    const limiter = limiters[preset] ?? limiters.api
    if (!limiter) return rateLimitMemory(preset)

    const id = await getClientKey(preset)
    const result = await limiter.limit(id)

    if (result.success) return { ok: true }
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    return { ok: false, retryAfter }
  } catch (err) {
    console.error("[rateLimit] Redis operation failed:", err)
    return rateLimitMemory(preset)
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function rateLimit(
  _req: Request,
  preset: keyof typeof PRESETS = "api"
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  // Use Redis strictly in production if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return rateLimitRedis(preset)
  }
  // Otherwise default to memory (works for dev / single-instance deployments)
  return rateLimitMemory(preset)
}

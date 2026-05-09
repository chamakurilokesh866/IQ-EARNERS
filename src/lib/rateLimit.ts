import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/**
 * Rate limiter for API routes.
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory store otherwise (single-instance only).
 *
 * Uses the incoming Request for client IP (avoids next/headers during static analysis / build).
 */

function getClientKeyFromRequest(req: Request, prefix: string): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const realIp = req.headers.get("x-real-ip")
  const ip = (forwarded?.split(",")[0]?.trim() || realIp || "unknown").slice(0, 64)
  return `${prefix}:${ip}`
}
function sanitizePart(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, "").slice(0, 96) || "unknown"
}

export type RateLimitConfig = {
  windowMs: number
  max: number
}

export const PRESETS: Record<string, RateLimitConfig> = {
  login: { windowMs: 60_000, max: 8 },
  adminLogin: { windowMs: 60_000, max: 5 },
  orgLogin: { windowMs: 60_000, max: 6 },
  mockExamGenerate: { windowMs: 5 * 60_000, max: 6 },
  aiGenerate: { windowMs: 60_000, max: 15 },
  integrity: { windowMs: 60_000, max: 30 },
  feedback: { windowMs: 60_000, max: 10 },
  referral: { windowMs: 60_000, max: 20 },
  payment: { windowMs: 60_000, max: 10 },
  api: { windowMs: 60_000, max: 100 },
  security: { windowMs: 60_000, max: 15 },
  checkUsername: { windowMs: 60_000, max: 30 },
  checkEmail: { windowMs: 60_000, max: 40 },
  createUsernameRequestOtp: { windowMs: 15 * 60_000, max: 5 },
  createUsernameVerifyOtp: { windowMs: 5 * 60_000, max: 10 },
  forgotPasswordRequest: { windowMs: 15 * 60_000, max: 3 },
  forgotPasswordVerify: { windowMs: 5 * 60_000, max: 10 },
  forgotPasswordReset: { windowMs: 15 * 60_000, max: 5 },
}

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

async function rateLimitMemoryByKey(
  key: string,
  preset: keyof typeof PRESETS
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  cleanup()
  const config = PRESETS[preset] ?? PRESETS.api
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
async function rateLimitMemory(
  req: Request,
  preset: keyof typeof PRESETS
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  return rateLimitMemoryByKey(getClientKeyFromRequest(req, preset), preset)
}

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
        ephemeralCache: new Map(),
      })
    }
    redisLimiters = limiters
    return limiters
  } catch {
    return null
  }
}

async function rateLimitRedisByKey(
  key: string,
  preset: keyof typeof PRESETS
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const limiters = getRedisLimiters()
  if (!limiters) return rateLimitMemoryByKey(key, preset)

  try {
    const limiter = limiters[preset] ?? limiters.api
    if (!limiter) return rateLimitMemoryByKey(key, preset)

    const result = await limiter.limit(key)

    if (result.success) return { ok: true }
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    return { ok: false, retryAfter }
  } catch {
    return rateLimitMemoryByKey(key, preset)
  }
}
async function rateLimitRedis(
  req: Request,
  preset: keyof typeof PRESETS
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  return rateLimitRedisByKey(getClientKeyFromRequest(req, preset), preset)
}

export async function rateLimit(
  req: Request,
  preset: keyof typeof PRESETS = "api"
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return rateLimitRedis(req, preset)
  }
  return rateLimitMemory(req, preset)
}

/** Apply both IP limiter and optional account limiter for sensitive auth/payment routes. */
export async function rateLimitByAccount(
  req: Request,
  preset: keyof typeof PRESETS,
  accountKey?: string
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const ipKey = getClientKeyFromRequest(req, preset)
  const acct = sanitizePart(accountKey || "")
  const accountScopedKey = `${preset}:acct:${acct}`
  const useRedis = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  const ipResult = useRedis ? await rateLimitRedisByKey(ipKey, preset) : await rateLimitMemoryByKey(ipKey, preset)
  if (!ipResult.ok) return ipResult
  if (!accountKey?.trim()) return { ok: true }
  return useRedis ? rateLimitRedisByKey(accountScopedKey, preset) : rateLimitMemoryByKey(accountScopedKey, preset)
}

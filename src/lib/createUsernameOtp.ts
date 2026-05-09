/**
 * OTP store for create-username verification.
 * Uses tmp file for serverless compatibility (Vercel /tmp is writable).
 * Security: TTL, max failed attempts, timing-safe compare, no OTP in logs.
 */
import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

const TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_VERIFY_ATTEMPTS = 5
const MAX_TOKEN_LENGTH = 512

function getStorePath(): string {
  try {
    return path.join(os.tmpdir(), "iq-create-username-otp.json")
  } catch {
    return path.join(process.cwd(), "src", "data", "otp-sessions.json")
  }
}

function tokenKey(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 32)
}

type Entry = { otp: string; expires: number; attempts: number; verifiedAt?: number }

async function readStore(): Promise<Record<string, Entry>> {
  try {
    const p = getStorePath()
    const txt = await fs.readFile(p, "utf-8").catch(() => "{}")
    const raw = JSON.parse(txt || "{}") as Record<string, Entry>
    const now = Date.now()
    const filtered: Record<string, Entry> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (v?.expires > now && (v.attempts ?? 0) < MAX_VERIFY_ATTEMPTS) {
        filtered[k] = { ...v, attempts: v.attempts ?? 0 }
      }
    }
    return filtered
  } catch {
    return {}
  }
}

async function writeStore(data: Record<string, Entry>): Promise<void> {
  try {
    const p = getStorePath()
    await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => {})
    await fs.writeFile(p, JSON.stringify(data, null, 0), "utf-8")
  } catch {}
}

/** Normalize and validate token (length limit to prevent DoS). */
export function validateToken(token: string): boolean {
  return typeof token === "string" && token.length > 0 && token.length <= MAX_TOKEN_LENGTH
}

/** Normalize OTP to digits only; length must be 4 or 6. */
export function normalizeOtpInput(otp: string, expectedLength: 4 | 6): string | null {
  const digits = String(otp).trim().replace(/\D/g, "")
  if (digits.length !== expectedLength) return null
  if (!/^\d+$/.test(digits)) return null
  return digits
}

export async function storeOtp(token: string, otp: string, length: number): Promise<void> {
  if (!validateToken(token)) return
  const key = tokenKey(token)
  const store = await readStore()
  store[key] = {
    otp: otp.slice(0, length),
    expires: Date.now() + TTL_MS,
    attempts: 0,
    verifiedAt: undefined
  }
  await writeStore(store)
}

export async function verifyOtp(token: string, otp: string): Promise<boolean> {
  if (!validateToken(token)) return false
  const key = tokenKey(token)
  const store = await readStore()
  const entry = store[key]
  if (!entry || entry.expires < Date.now()) return false
  if ((entry.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    delete store[key]
    await writeStore(store)
    return false
  }
  const userInput = String(otp).trim().replace(/\D/g, "")
  if (userInput.length !== entry.otp.length) {
    entry.attempts = (entry.attempts ?? 0) + 1
    store[key] = entry
    await writeStore(store)
    return false
  }
  const ok = crypto.timingSafeEqual(Buffer.from(entry.otp, "utf8"), Buffer.from(userInput, "utf8"))
  if (!ok) {
    entry.attempts = (entry.attempts ?? 0) + 1
    store[key] = entry
    await writeStore(store)
    return false
  }
  entry.verifiedAt = Date.now()
  store[key] = entry
  await writeStore(store)
  return true
}

/** Server-side proof that OTP was already verified for this token. */
export async function isOtpVerified(token: string): Promise<boolean> {
  if (!validateToken(token)) return false
  const key = tokenKey(token)
  const store = await readStore()
  const entry = store[key]
  if (!entry || entry.expires < Date.now()) return false
  return typeof entry.verifiedAt === "number" && entry.verifiedAt > 0
}

/** Consume OTP after successful profile creation (one-time use). */
export async function consumeOtp(token: string): Promise<void> {
  if (!validateToken(token)) return
  const key = tokenKey(token)
  const store = await readStore()
  delete store[key]
  await writeStore(store)
}

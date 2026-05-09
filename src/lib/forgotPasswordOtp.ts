/**
 * Forgot-password OTP store and reset token.
 * OTP format: IQPR-XX-XX (e.g. IQPR-A3-K9). Stored keyed by username (lowercase).
 * Reset token: signed, one-time use, short TTL.
 */
import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const RESET_TOKEN_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_VERIFY_ATTEMPTS = 5
const USERNAME_MAX_LEN = 64
const OTP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0,O,1,I,L to avoid confusion

const OTP_STORE = "iq-forgot-password-otp.json"
const RESET_USED = "iq-forgot-password-used.json"

function getStoreDir(): string {
  try {
    return os.tmpdir()
  } catch {
    return path.join(process.cwd(), "src", "data")
  }
}

function usernameKey(username: string): string {
  return crypto.createHash("sha256").update(username.toLowerCase().trim()).digest("hex").slice(0, 32)
}

/** Generate OTP in format IQPS-### (3 digits). */
export function generateForgotOtp(): string {
  let s = "IQPS-"
  for (let i = 0; i < 3; i++) {
    s += crypto.randomInt(0, 10).toString()
  }
  return s
}

export function validateUsername(username: string): boolean {
  return typeof username === "string" && username.trim().length > 0 && username.length <= USERNAME_MAX_LEN
}

type OtpEntry = { otp: string; expires: number; attempts: number }

async function readOtpStore(): Promise<Record<string, OtpEntry>> {
  try {
    const p = path.join(getStoreDir(), OTP_STORE)
    const txt = await fs.readFile(p, "utf-8").catch(() => "{}")
    const raw = JSON.parse(txt || "{}") as Record<string, OtpEntry>
    const now = Date.now()
    const out: Record<string, OtpEntry> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (v?.expires > now && (v.attempts ?? 0) < MAX_VERIFY_ATTEMPTS) out[k] = { ...v, attempts: v.attempts ?? 0 }
    }
    return out
  } catch {
    return {}
  }
}

async function writeOtpStore(data: Record<string, OtpEntry>): Promise<void> {
  try {
    const p = path.join(getStoreDir(), OTP_STORE)
    await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => { })
    await fs.writeFile(p, JSON.stringify(data, null, 0), "utf-8")
  } catch { }
}

export async function storeForgotOtp(username: string, otp: string): Promise<void> {
  if (!validateUsername(username)) return
  const key = usernameKey(username)
  const store = await readOtpStore()
  store[key] = { otp: otp.toUpperCase().trim(), expires: Date.now() + OTP_TTL_MS, attempts: 0 }
  await writeOtpStore(store)
}

/** Normalize user input: uppercase, strip spaces. Accept full `IQPS-###` or just the 3 digits. */
export function normalizeForgotOtpInput(input: string): string {
  const s = String(input).trim().toUpperCase().replace(/\s/g, "")
  if (/^\d{3}$/.test(s)) return `IQPS-${s}`
  return s
}

export async function verifyForgotOtp(username: string, otp: string): Promise<boolean> {
  if (!validateUsername(username)) return false
  const key = usernameKey(username)
  const store = await readOtpStore()
  const entry = store[key]
  if (!entry || entry.expires < Date.now()) return false
  if ((entry.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    delete store[key]
    await writeOtpStore(store)
    return false
  }
  const normalized = normalizeForgotOtpInput(otp)
  const expected = entry.otp
  if (normalized.length !== expected.length) {
    entry.attempts = (entry.attempts ?? 0) + 1
    store[key] = entry
    await writeOtpStore(store)
    return false
  }
  const ok = crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(normalized, "utf8"))
  if (!ok) {
    entry.attempts = (entry.attempts ?? 0) + 1
    store[key] = entry
    await writeOtpStore(store)
  }
  return ok
}

export async function consumeForgotOtp(username: string): Promise<void> {
  if (!validateUsername(username)) return
  const key = usernameKey(username)
  const store = await readOtpStore()
  delete store[key]
  await writeOtpStore(store)
}

// ----- Reset token (one-time use after OTP verify) -----
const RESET_SECRET = process.env.RESET_PASSWORD_SECRET ?? process.env.USERNAME_TOKEN_SECRET ?? process.env.TOKEN_SECRET ?? "forgot-password-reset"

async function readUsedTokens(): Promise<Record<string, number>> {
  try {
    const p = path.join(getStoreDir(), RESET_USED)
    const txt = await fs.readFile(p, "utf-8").catch(() => "{}")
    const raw = JSON.parse(txt || "{}") as Record<string, number>
    const now = Date.now()
    const out: Record<string, number> = {}
    for (const [k, exp] of Object.entries(raw)) {
      if (exp > now) out[k] = exp
    }
    return out
  } catch {
    return {}
  }
}

async function writeUsedTokens(data: Record<string, number>): Promise<void> {
  try {
    const p = path.join(getStoreDir(), RESET_USED)
    await fs.mkdir(path.dirname(p), { recursive: true }).catch(() => { })
    await fs.writeFile(p, JSON.stringify(data, null, 0), "utf-8")
  } catch { }
}

export function createResetToken(username: string): string {
  const exp = Date.now() + RESET_TOKEN_TTL_MS
  const nonce = crypto.randomBytes(16).toString("hex")
  const payload = JSON.stringify({ u: username.trim().toLowerCase(), exp, n: nonce })
  const sig = crypto.createHmac("sha256", RESET_SECRET).update(payload).digest("hex")
  return Buffer.from(JSON.stringify({ p: payload, s: sig })).toString("base64url")
}

export async function verifyAndConsumeResetToken(token: string): Promise<string | null> {
  let payload: { u: string; exp: number; n: string }
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"))
    const expected = crypto.createHmac("sha256", RESET_SECRET).update(decoded.p).digest("hex")
    if (!crypto.timingSafeEqual(Buffer.from(decoded.s, "hex"), Buffer.from(expected, "hex"))) return null
    payload = JSON.parse(decoded.p) as { u: string; exp: number; n: string }
  } catch {
    return null
  }
  if (!payload?.u || typeof payload.exp !== "number" || !payload.n) return null
  if (payload.exp < Date.now()) return null
  const used = await readUsedTokens()
  if (used[payload.n]) return null
  used[payload.n] = payload.exp
  await writeUsedTokens(used)
  return payload.u
}

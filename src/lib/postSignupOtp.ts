/**
 * OTP after account creation (payment-proof path): confirms email before first login.
 * Separate store from create-username JWT OTP to avoid key collisions.
 */
import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"
import os from "os"

const TTL_MS = 5 * 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5

function getStorePath(): string {
  try {
    return path.join(os.tmpdir(), "iq-post-signup-otp.json")
  } catch {
    return path.join(process.cwd(), "src", "data", "post-signup-otp.json")
  }
}

function sessionKey(sessionToken: string): string {
  return crypto.createHash("sha256").update(`post:${sessionToken}`).digest("hex").slice(0, 32)
}

type Entry = { otp: string; expires: number; attempts: number; uid: string; email: string }

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

export function validateSessionToken(t: string): boolean {
  return typeof t === "string" && t.length === 64 && /^[a-f0-9]+$/i.test(t)
}

export function randomOtp(length: 4 | 6): string {
  let out = ""
  for (let i = 0; i < length; i++) {
    out += crypto.randomInt(0, 10).toString()
  }
  return out
}

export async function storePostSignupOtp(
  sessionToken: string,
  uid: string,
  email: string,
  otp: string,
  length: 4 | 6
): Promise<void> {
  if (!validateSessionToken(sessionToken)) return
  const key = sessionKey(sessionToken)
  const store = await readStore()
  store[key] = {
    otp: otp.slice(0, length),
    expires: Date.now() + TTL_MS,
    attempts: 0,
    uid,
    email
  }
  await writeStore(store)
}

export async function verifyPostSignupOtp(sessionToken: string, otp: string): Promise<{ ok: true; uid: string; email: string } | { ok: false }> {
  if (!validateSessionToken(sessionToken)) return { ok: false }
  const key = sessionKey(sessionToken)
  const store = await readStore()
  const entry = store[key]
  if (!entry || entry.expires < Date.now()) return { ok: false }
  if ((entry.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    delete store[key]
    await writeStore(store)
    return { ok: false }
  }
  const userInput = String(otp).trim().replace(/\D/g, "")
  if (userInput.length !== entry.otp.length) {
    entry.attempts = (entry.attempts ?? 0) + 1
    store[key] = entry
    await writeStore(store)
    return { ok: false }
  }
  const valid = crypto.timingSafeEqual(Buffer.from(entry.otp, "utf8"), Buffer.from(userInput, "utf8"))
  if (!valid) {
    entry.attempts = (entry.attempts ?? 0) + 1
    store[key] = entry
    await writeStore(store)
    return { ok: false }
  }
  delete store[key]
  await writeStore(store)
  return { ok: true, uid: entry.uid, email: entry.email }
}

/** Read pending entry (for resend) without consuming. */
export async function peekPostSignupEntry(
  sessionToken: string
): Promise<{ uid: string; email: string } | null> {
  if (!validateSessionToken(sessionToken)) return null
  const key = sessionKey(sessionToken)
  const store = await readStore()
  const entry = store[key]
  if (!entry || entry.expires < Date.now()) return null
  return { uid: entry.uid, email: entry.email }
}

export async function updatePostSignupOtp(sessionToken: string, otp: string, length: 4 | 6): Promise<boolean> {
  if (!validateSessionToken(sessionToken)) return false
  const key = sessionKey(sessionToken)
  const store = await readStore()
  const entry = store[key]
  if (!entry || entry.expires < Date.now()) return false
  store[key] = {
    ...entry,
    otp: otp.slice(0, length),
    expires: Date.now() + TTL_MS,
    attempts: 0
  }
  await writeStore(store)
  return true
}

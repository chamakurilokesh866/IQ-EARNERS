/**
 * CSRF token generation and validation.
 * Token is stored in a cookie; client must send it in X-CSRF-Token header.
 */

import { cookies } from "next/headers"
import crypto from "crypto"

const CSRF_COOKIE = "csrf_token"
const TOKEN_BYTES = 32

export function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex")
}

export async function getOrCreateCsrfToken(): Promise<string> {
  const store = await cookies()
  const existing = store.get(CSRF_COOKIE)?.value
  if (existing && existing.length === TOKEN_BYTES * 2) return existing
  const token = generateToken()
  return token
}

export async function validateCsrf(req: Request): Promise<boolean> {
  const store = await cookies()
  const cookieToken = store.get(CSRF_COOKIE)?.value ?? ""
  const headerToken = req.headers.get("x-csrf-token")?.trim() ?? ""
  if (!cookieToken || !headerToken) return false
  if (cookieToken.length !== TOKEN_BYTES * 2 || headerToken.length !== TOKEN_BYTES * 2) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(cookieToken, "hex"), Buffer.from(headerToken, "hex"))
  } catch {
    return false
  }
}

export function getCsrfCookieName() {
  return CSRF_COOKIE
}

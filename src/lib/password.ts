import crypto from "crypto"

const SALT_LEN = 16
const KEY_LEN = 64
const SCRYPT_N = 16384
const SCRYPT_P = 1
const SCRYPT_R = 8

/** Hash a password for storage. Returns "salt:hash" hex-encoded. */
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(SALT_LEN)
  const hash = crypto.scryptSync(plain, salt, KEY_LEN, { N: SCRYPT_N, p: SCRYPT_P, r: SCRYPT_R })
  return `${salt.toString("hex")}:${hash.toString("hex")}`
}

/** Verify a plain password against a stored "salt:hash" value. */
export function verifyPassword(plain: string, stored: string): boolean {
  if (!stored || !plain) return false
  const [saltHex, hashHex] = stored.split(":")
  if (!saltHex || !hashHex) return false
  try {
    const salt = Buffer.from(saltHex, "hex")
    const expected = Buffer.from(hashHex, "hex")
    const actual = crypto.scryptSync(plain, salt, KEY_LEN, { N: SCRYPT_N, p: SCRYPT_P, r: SCRYPT_R })
    return crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

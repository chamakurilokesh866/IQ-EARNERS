import crypto from "crypto"

export type QuizAttemptTokenPayload = {
  u: string
  q: string
  n: string
  iat: number
  exp: number
}

const TTL_MS = 1000 * 60 * 90 // 90 minutes

function getSecret(): string {
  return (
    process.env.QUIZ_ATTEMPT_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "quiz-attempt-fallback-secret"
  )
}

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export function createQuizAttemptToken(username: string, quizId: string): { token: string; nonce: string; exp: number } {
  const now = Date.now()
  const exp = now + TTL_MS
  const nonce = crypto.randomBytes(12).toString("hex")
  const payload: QuizAttemptTokenPayload = {
    u: String(username ?? "").trim().toLowerCase(),
    q: String(quizId ?? "").trim(),
    n: nonce,
    iat: now,
    exp
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url")
  const sig = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
  return { token: `${payloadB64}.${sig}`, nonce, exp }
}

export function verifyQuizAttemptToken(token: string): QuizAttemptTokenPayload | null {
  try {
    const [payloadB64, sig] = String(token ?? "").split(".")
    if (!payloadB64 || !sig) return null
    const expected = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url")
    if (!timingSafeCompare(sig, expected)) return null
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as QuizAttemptTokenPayload
    if (!payload?.u || !payload?.q || !payload?.n || !payload?.exp || !payload?.iat) return null
    if (Date.now() > Number(payload.exp)) return null
    return payload
  } catch {
    return null
  }
}

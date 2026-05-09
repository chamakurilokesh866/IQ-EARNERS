import crypto from "crypto"

type StartPayload = {
  kind: "manual_qr_start"
  nonce: string
  iat: number
  exp: number
}

type YesPayload = {
  kind: "manual_qr_yes"
  nonce: string
  startAt: number
  yesAt: number
  iat: number
  exp: number
}

function getSecret(): string {
  return (
    process.env.MANUAL_QR_FLOW_SECRET ??
    process.env.ADMIN_PASSWORD ??
    process.env.PAYMENT_WEBHOOK_SECRET ??
    "manual-qr-flow-fallback"
  ).trim()
}

function timingSafeEq(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ab.length !== bb.length) return false
    return crypto.timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

function sign(payload: StartPayload | YesPayload): string {
  const raw = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = crypto.createHmac("sha256", getSecret()).update(raw).digest("base64url")
  return `${raw}.${sig}`
}

function decode<T>(token: string): T | null {
  try {
    const [raw, sig] = token.split(".")
    if (!raw || !sig) return null
    const expected = crypto.createHmac("sha256", getSecret()).update(raw).digest("base64url")
    if (!timingSafeEq(sig, expected)) return null
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as T
  } catch {
    return null
  }
}

export function createManualQrStartToken(windowMs = 5 * 60 * 1000): { token: string; startAt: number; expiresAt: number } {
  const now = Date.now()
  const payload: StartPayload = {
    kind: "manual_qr_start",
    nonce: crypto.randomBytes(12).toString("hex"),
    iat: now,
    exp: now + windowMs,
  }
  return { token: sign(payload), startAt: payload.iat, expiresAt: payload.exp }
}

export function verifyManualQrStartToken(token: string): StartPayload | null {
  const payload = decode<StartPayload>(token)
  if (!payload || payload.kind !== "manual_qr_start") return null
  if (!payload.nonce || !payload.iat || !payload.exp) return null
  if (Date.now() > payload.exp) return null
  return payload
}

export function createManualQrYesToken(start: StartPayload, yesAt = Date.now()): { token: string; yesAt: number; expiresAt: number } {
  const exp = Math.min(start.exp, yesAt + 5 * 60 * 1000)
  const payload: YesPayload = {
    kind: "manual_qr_yes",
    nonce: start.nonce,
    startAt: start.iat,
    yesAt,
    iat: yesAt,
    exp,
  }
  return { token: sign(payload), yesAt: payload.yesAt, expiresAt: payload.exp }
}

export function verifyManualQrYesToken(token: string): YesPayload | null {
  const payload = decode<YesPayload>(token)
  if (!payload || payload.kind !== "manual_qr_yes") return null
  if (!payload.nonce || !payload.startAt || !payload.yesAt || !payload.exp) return null
  if (Date.now() > payload.exp) return null
  if (payload.yesAt < payload.startAt) return null
  return payload
}

/**
 * Organization session management.
 * Org sessions use a signed JSON cookie "org_session" completely separate from the main app.
 */
import { cookies } from "next/headers"
import { createHash } from "crypto"

const ORG_COOKIE = "org_session"
const ORG_MAX_AGE = 60 * 60 * 24 * 7
const isProd = process.env.NODE_ENV === "production"

function signatureSecret(): string {
  return process.env.ORG_SESSION_SECRET || process.env.NVIDIA_API_KEY || "iq-org-session-fallback-key"
}

function sign(payload: string): string {
  return createHash("sha256").update(payload + ":" + signatureSecret(), "utf8").digest("hex").slice(0, 16)
}

export type OrgSession = {
  orgId: string
  orgSlug: string
  memberId: string
  memberName: string
  role: "owner" | "admin" | "teacher" | "student"
}

export function encodeOrgSession(session: OrgSession): string {
  const json = JSON.stringify(session)
  const b64 = Buffer.from(json, "utf8").toString("base64url")
  return `${b64}.${sign(b64)}`
}

export function decodeOrgSession(value: string): OrgSession | null {
  if (!value) return null
  const [b64, sig] = value.split(".")
  if (!b64 || !sig) return null
  if (sign(b64) !== sig) return null
  try {
    const json = Buffer.from(b64, "base64url").toString("utf8")
    const obj = JSON.parse(json) as OrgSession
    if (!obj.orgId || !obj.orgSlug || !obj.memberId || !obj.role) return null
    return obj
  } catch {
    return null
  }
}

export async function getOrgSession(): Promise<OrgSession | null> {
  try {
    const store = await cookies()
    const raw = store.get(ORG_COOKIE)?.value ?? ""
    return decodeOrgSession(raw)
  } catch {
    return null
  }
}

export async function requireOrgSession(slug?: string): Promise<
  | { ok: true; session: OrgSession }
  | { ok: false; error: string; status: number }
> {
  const session = await getOrgSession()
  if (!session) return { ok: false, error: "Not logged in", status: 401 }
  if (slug && session.orgSlug !== slug) return { ok: false, error: "Wrong organization", status: 403 }
  return { ok: true, session }
}

export async function requireOrgOwnerOrAdmin(slug?: string): Promise<
  | { ok: true; session: OrgSession }
  | { ok: false; error: string; status: number }
> {
  const result = await requireOrgSession(slug)
  if (!result.ok) return result
  if (result.session.role !== "owner" && result.session.role !== "admin") {
    return { ok: false, error: "Owner or admin access required", status: 403 }
  }
  return result
}

export function orgCookieOptions() {
  return {
    name: ORG_COOKIE,
    path: "/",
    maxAge: ORG_MAX_AGE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
  }
}

export function orgClearOptions() {
  return {
    name: ORG_COOKIE,
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
  }
}

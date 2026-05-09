import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid, upsertProfile } from "@/lib/profiles"
import { validateCsrf } from "@/lib/csrf"
import { rateLimit } from "@/lib/rateLimit"

function normalizeLegalName(input: string): string {
  return input.replace(/\s+/g, " ").trim()
}

function isValidLegalName(name: string): boolean {
  if (name.length < 3 || name.length > 80) return false
  return /^[A-Za-z][A-Za-z\s'.-]*[A-Za-z.]$/.test(name)
}

export async function GET(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  if (!uid) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 })
  const profile = await getProfileByUid(uid)
  if (!profile) return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 })
  const legalName = typeof profile.legalName === "string" ? profile.legalName : ""
  return NextResponse.json({ ok: true, data: { legalName } })
}

export async function POST(req: Request) {
  const csrfOk = await validateCsrf(req)
  if (!csrfOk) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 403 })
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })

  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  if (!uid) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 })

  const profile = await getProfileByUid(uid)
  if (!profile) return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const raw = typeof body?.legalName === "string" ? String(body.legalName) : ""
  const legalName = normalizeLegalName(raw)
  if (!isValidLegalName(legalName)) {
    return NextResponse.json(
      { ok: false, error: "Enter a valid legal name (3-80 letters, spaces, apostrophe, dot, hyphen)." },
      { status: 400 }
    )
  }

  const ok = await upsertProfile({ ...profile, legalName, updated_at: Date.now() })
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save legal name" }, { status: 500 })
  return NextResponse.json({ ok: true, data: { legalName } })
}

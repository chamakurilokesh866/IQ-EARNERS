import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateOrigin } from "@/lib/auth"
import { getSettings, updateSettings } from "@/lib/settings"

const SENSITIVE_KEYS = [
  "blockedUsers", "qrImageUrl", "blockedQrUrl", "upiId", "upi_id",
  "blockedAmount", "aiQuestionLimit", "createUsernameOtpLength",
  "allowDeveloperOptions", "seoVerification", "certFirst", "certRunnerUp",
  "certParticipation", "enterprise"
]

export async function GET(req: Request) {
  try {
    const data = await getSettings()
    const store = await cookies()
    const isAdmin = store.get("role")?.value === "admin"
    if (isAdmin) {
      return NextResponse.json({ ok: true, data })
    }
    const publicData = { ...data }
    for (const key of SENSITIVE_KEYS) {
      delete (publicData as Record<string, unknown>)[key]
    }
    return NextResponse.json({ ok: true, data: publicData })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const originCheck = validateOrigin(req)
  if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const ok = await updateSettings(body)
  return NextResponse.json(ok ? { ok: true } : { ok: false, error: "Failed to save settings" }, { status: ok ? 200 : 500 })
}

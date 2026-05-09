import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { updateSettings } from "@/lib/settings"

/** Mirrors public /api/settings POST — several admin UI cards post here. */
export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const ok = await updateSettings(body)
  return NextResponse.json(ok ? { ok: true } : { ok: false, error: "Failed to save settings" }, { status: ok ? 200 : 500 })
}

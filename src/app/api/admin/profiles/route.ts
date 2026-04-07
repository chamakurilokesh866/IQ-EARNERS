import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfiles, deleteProfileByUsername } from "@/lib/profiles"

export async function GET() {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const profiles = await getProfiles()
  return NextResponse.json({ ok: true, data: profiles })
}

export async function DELETE(req: Request) {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const url = new URL(req.url)
  const username = url.searchParams.get("username")?.trim()
  if (!username) return NextResponse.json({ ok: false, error: "username required" }, { status: 400 })
  const ok = await deleteProfileByUsername(username)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "User not found" }, { status: 404 })
}

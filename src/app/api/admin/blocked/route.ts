import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getBlockedList, blockUser, removeBlockedUser } from "@/lib/blocked"

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const arr = await getBlockedList()
  return NextResponse.json({ ok: true, data: arr })
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username ?? "").trim()
  const reason = String(body?.reason ?? "Blocked by admin").trim().slice(0, 500)
  if (!username) return NextResponse.json({ ok: false, error: "Username required" }, { status: 400 })
  const ok = await blockUser(username, reason)
  if (!ok) return NextResponse.json({ ok: false, error: "Already blocked" }, { status: 400 })
  return NextResponse.json({ ok: true, data: { username, reason } })
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const url = new URL(req.url)
  const username = url.searchParams.get("username")?.trim()
  if (!username) return NextResponse.json({ ok: false, error: "Username required" }, { status: 400 })
  const ok = await removeBlockedUser(username)
  if (!ok) return NextResponse.json({ ok: false, error: "Not blocked" }, { status: 404 })
  return NextResponse.json({ ok: true })
}

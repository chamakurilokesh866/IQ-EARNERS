import { NextResponse } from "next/server"
import { isBlocked } from "@/lib/blocked"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const username = url.searchParams.get("username")?.trim()
  if (!username) return NextResponse.json({ ok: false, error: "username required" }, { status: 400 })
  const entry = await isBlocked(username)
  return NextResponse.json({ ok: true, blocked: !!entry })
}

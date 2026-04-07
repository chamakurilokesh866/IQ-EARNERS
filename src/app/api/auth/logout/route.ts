import { NextResponse } from "next/server"
import { clearCookieOptions } from "@/lib/cookieOptions"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set("role", "", clearCookieOptions())
  return res
}

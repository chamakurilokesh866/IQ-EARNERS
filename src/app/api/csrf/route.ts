import { NextResponse } from "next/server"
import { getOrCreateCsrfToken, getCsrfCookieName } from "@/lib/csrf"
import { cookieOptions } from "@/lib/cookieOptions"

export async function GET(req: Request) {
  const token = await getOrCreateCsrfToken()
  const res = NextResponse.json({ ok: true, token })
  res.cookies.set(getCsrfCookieName(), token, cookieOptions({ maxAge: 60 * 60 * 24, httpOnly: false, sameSite: "strict" }))
  return res
}

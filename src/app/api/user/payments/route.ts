import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"
import { getPayments } from "@/lib/payments"
import { getProfileByUid } from "@/lib/profiles"
import { rateLimit } from "@/lib/rateLimit"

export async function GET(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  try {
    const cookieStore = await cookies()
    const uid = cookieStore.get("uid")?.value ?? ""
    const usernameCookie = cookieStore.get("username")?.value ?? ""
    let username = ""
    try { username = decodeURIComponent(usernameCookie) } catch {}

    const profile = uid ? await getProfileByUid(uid) : null
    const uname = profile?.username ?? username
    if (!uid && !uname) return NextResponse.json({ ok: true, data: [] })

    const all = await getPayments()
    const mine = all.filter((p: any) => {
      if (p.profileId && p.profileId === uid) return true
      const metaName = String((p?.meta as any)?.name ?? (p?.meta as any)?.username ?? (p?.meta as any)?.customerName ?? "").toLowerCase()
      return uname && metaName === uname.toLowerCase()
    })
    const sorted = [...mine].sort((a, b) => Number(b.created_at ?? 0) - Number(a.created_at ?? 0))
    return NextResponse.json({ ok: true, data: sorted })
  } catch {
    return NextResponse.json({ ok: true, data: [] })
  }
}

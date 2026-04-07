import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPayments } from "@/lib/payments"
import { getProfileByUid } from "@/lib/profiles"
import { getEnrollmentsByUsername } from "@/lib/enrollments"
import { promises as fs } from "fs"
import path from "path"

const USER_STATS_PATH = path.join(process.cwd(), "src", "data", "user-stats.json")

export type ActivityItem = {
  type: "payment" | "quiz" | "enrollment" | "referral"
  title: string
  meta?: string
  when: string
  whenTs: number
  status?: string
  points?: string
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const uid = cookieStore.get("uid")?.value ?? ""
    let username = ""
    try { username = decodeURIComponent(cookieStore.get("username")?.value ?? "") } catch {}

    const profile = uid ? await getProfileByUid(uid) : null
    const uname = profile?.username ?? username
    if (!uname) return NextResponse.json({ ok: true, data: [] })

    const activities: ActivityItem[] = []
    const unameLower = uname.toLowerCase()

    const payments = await getPayments()
    const myPayments = payments.filter((p: any) => {
      if (p.profileId === uid) return true
      const metaName = String((p?.meta as any)?.name ?? (p?.meta as any)?.username ?? (p?.meta as any)?.customerName ?? "").toLowerCase()
      return metaName === unameLower
    })
    for (const p of myPayments.slice(0, 20)) {
      activities.push({
        type: "payment",
        title: "Payment",
        meta: `₹${p.amount ?? 0} • ${p.gateway ?? "—"}`,
        when: p.created_at ? new Date(p.created_at).toLocaleString() : "",
        whenTs: Number(p.created_at ?? 0),
        status: p.status ?? "pending",
        points: p.status === "success" ? "✓" : "—"
      })
    }

    try {
      const txt = await fs.readFile(USER_STATS_PATH, "utf-8")
      const all: Record<string, { history?: Array<{ date: string; score: number; total: number }> }> = JSON.parse(txt || "{}")
      const user = all[unameLower]
      const history = user?.history ?? []
      for (const h of history.slice(-15).reverse()) {
        activities.push({
          type: "quiz",
          title: "Quiz completed",
          meta: `${h.score}/${h.total} correct`,
          when: h.date ? new Date(h.date).toLocaleString() : "",
          whenTs: h.date ? new Date(h.date).getTime() : 0,
          points: `+${h.score}`
        })
      }
    } catch {}

    try {
      const enrollments = await getEnrollmentsByUsername(uname)
      for (const e of enrollments.slice(-10)) {
        activities.push({
          type: "enrollment",
          title: "Enrolled in Tournament",
          meta: e.tournamentId ?? "Participant",
          when: e.paidAt ? new Date(e.paidAt).toLocaleString() : "",
          whenTs: Number(e.paidAt ?? 0),
          points: "+1"
        })
      }
    } catch {}

    activities.sort((a, b) => b.whenTs - a.whenTs)
    return NextResponse.json({ ok: true, data: activities.slice(0, 30) })
  } catch {
    return NextResponse.json({ ok: true, data: [] })
  }
}

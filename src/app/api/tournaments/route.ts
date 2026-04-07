import { NextResponse } from "next/server"
import { audit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth"
import { getTournaments, addTournament, replaceTournaments } from "@/lib/tournaments"

export async function GET() {
  const data = await getTournaments()
  return NextResponse.json({ ok: true, data: Array.isArray(data) ? data : [] }, {
    headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
  })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const current = await getTournaments()

  if (Array.isArray(body?.items)) {
    const ok = await replaceTournaments(body.items)
    if (ok) await audit(req, "tournaments.replace", { count: body.items.length })
    return NextResponse.json(ok ? { ok: true } : { ok: false, error: "Failed" }, { status: ok ? 200 : 500 })
  }

  if (body?.item) {
    const t = body.item
    if (!t.id) t.id = String(Date.now())
    t.enrolled = t.enrolled ?? 0
    const ok = await addTournament(t)
    if (ok) {
      await audit(req, "tournaments.add", { id: t.id })
      const { sendPushNotification } = await import("@/lib/push")
      await sendPushNotification({
        title: "New Tournament! 🏆",
        body: `Join the new tournament "${t.title || "Elite Challenge"}" and win exciting prizes!`,
        url: "/home"
      }).catch(() => { })
    }
    return NextResponse.json(ok ? { ok: true, id: t.id } : { ok: false, error: "Failed" }, { status: ok ? 200 : 500 })
  }

  return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
}

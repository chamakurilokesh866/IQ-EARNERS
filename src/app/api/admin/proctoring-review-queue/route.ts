import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createServerSupabase } from "@/lib/supabase"
import { readProctoringAlertState, writeProctoringAlertState } from "@/lib/proctoringAdminAlerts"
import { sendPushNotification } from "@/lib/push"
import { sendEmail } from "@/lib/email"
import { getSettings } from "@/lib/settings"

type QueueRow = {
  username: string
  events: number
  avgRisk: number
  cumulativeRisk: number
  lastEventAt: number
  topReasons: string[]
  recommendedAction: "block_review" | "watchlist"
}

function eventRisk(type: string, reason: string): number {
  const t = String(type).toLowerCase()
  const r = String(reason).toLowerCase()
  let s = 25
  if (t.includes("multiple_browser") || r.includes("multiple")) s += 45
  if (t.includes("time_consistency") || r.includes("suspicious")) s += 30
  if (t.includes("tab") || r.includes("fullscreen")) s += 20
  if (r.includes("blocked")) s += 20
  return Math.max(0, Math.min(100, s))
}

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const url = new URL(req.url)
  const lookback = Math.max(50, Math.min(1000, Number(url.searchParams.get("lookback") ?? 300)))
  const threshold = Math.max(40, Math.min(1000, Number(url.searchParams.get("threshold") ?? 180)))

  const supabase = createServerSupabase()
  if (!supabase) return NextResponse.json({ ok: true, data: [] as QueueRow[] })

  const { data, error } = await supabase
    .from("integrity_events")
    .select("username, type, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(lookback)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const byUser = new Map<string, { events: number; riskSum: number; last: number; reasons: Map<string, number> }>()
  for (const row of data ?? []) {
    const username = String((row as any)?.username ?? "").trim().toLowerCase()
    if (!username) continue
    const type = String((row as any)?.type ?? "")
    const reason = String((row as any)?.reason ?? "")
    const when = Number((row as any)?.created_at ?? 0)
    const risk = eventRisk(type, reason)

    const cur = byUser.get(username) ?? { events: 0, riskSum: 0, last: 0, reasons: new Map<string, number>() }
    cur.events += 1
    cur.riskSum += risk
    if (when > cur.last) cur.last = when
    const key = reason || type || "integrity_event"
    cur.reasons.set(key, (cur.reasons.get(key) ?? 0) + 1)
    byUser.set(username, cur)
  }

  const rows: QueueRow[] = Array.from(byUser.entries())
    .map(([username, v]) => {
      const avgRisk = v.events > 0 ? Math.round(v.riskSum / v.events) : 0
      const cumulativeRisk = Math.round(v.riskSum)
      const topReasons = Array.from(v.reasons.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason]) => reason)
      return {
        username,
        events: v.events,
        avgRisk,
        cumulativeRisk,
        lastEventAt: v.last,
        topReasons,
        recommendedAction: (cumulativeRisk >= threshold ? "block_review" : "watchlist") as "block_review" | "watchlist"
      }
    })
    .filter((r) => r.events >= 2)
    .sort((a, b) => b.cumulativeRisk - a.cumulativeRisk)
    .slice(0, 30)

  // Auto-alert admins when high-risk queue appears/crosses threshold.
  try {
    const settings = await getSettings()
    const alertsEnabled = settings.proctoringAlertsEnabled !== false
    const pushEnabled = settings.proctoringAlertsPush !== false
    const emailEnabled = settings.proctoringAlertsEmail !== false
    const cooldownMin = Math.max(1, Math.min(24 * 60, Number(settings.proctoringAlertsCooldownMin ?? 30)))
    const minIntervalMs = cooldownMin * 60 * 1000
    if (!alertsEnabled) {
      return NextResponse.json({ ok: true, data: rows, threshold })
    }

    const highRisk = rows.filter((r) => r.cumulativeRisk >= threshold).slice(0, 10)
    if (highRisk.length > 0) {
      const fingerprint = highRisk.map((r) => `${r.username}:${r.cumulativeRisk}`).join("|")
      const prev = await readProctoringAlertState()
      const now = Date.now()
      const shouldAlert =
        fingerprint !== String(prev.lastFingerprint ?? "") ||
        now - Number(prev.lastAlertAt ?? 0) > minIntervalMs

      if (shouldAlert) {
        const top = highRisk.slice(0, 3).map((r) => `@${r.username} (${r.cumulativeRisk})`).join(", ")
        if (pushEnabled) {
          await sendPushNotification({
            title: "🚨 Proctoring risk threshold crossed",
            body: `${highRisk.length} user(s) require review. Top: ${top}`,
            url: "/more/admin-dashboard?tab=AIAssistant"
          }).catch(() => ({ ok: false }))
        }

        const adminEmail = process.env.ADMIN_EMAIL || (process.env.ADMIN_USERNAME?.includes("@") ? process.env.ADMIN_USERNAME : "")
        if (emailEnabled && adminEmail) {
          await sendEmail({
            to: adminEmail,
            subject: `Proctoring alert: ${highRisk.length} high-risk user(s)`,
            html: `<p><strong>${highRisk.length}</strong> users crossed the proctoring risk threshold (${threshold}).</p><p>Top users: ${top}</p><p>Open Admin AI → Proctoring Review Queue.</p>`,
            text: `${highRisk.length} users crossed proctoring threshold ${threshold}. Top users: ${top}. Open Admin AI review queue.`
          }).catch(() => ({ ok: false }))
        }

        await writeProctoringAlertState({
          lastAlertAt: now,
          lastFingerprint: fingerprint
        })
      }
    }
  } catch {
    // never fail queue endpoint on notification issues
  }

  return NextResponse.json({ ok: true, data: rows, threshold })
}

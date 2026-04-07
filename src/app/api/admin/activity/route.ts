import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { cookies } from "next/headers"

const ROOT = path.join(process.cwd(), "src", "data")

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

async function readJSON(p: string): Promise<any[]> {
  try {
    const txt = await fs.readFile(p, "utf-8")
    const v = JSON.parse(txt)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

async function readUserStats(): Promise<Record<string, any>> {
  try {
    const txt = await fs.readFile(path.join(ROOT, "user-stats.json"), "utf-8")
    return JSON.parse(txt || "{}")
  } catch {
    return {}
  }
}

export async function GET() {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const [payments, participants, userStats, quizzes] = await Promise.all([
    readJSON(path.join(ROOT, "payments.json")),
    readJSON(path.join(ROOT, "participants.json")),
    readUserStats(),
    readJSON(path.join(ROOT, "quizzes.json"))
  ])

  type ActivityItem = { id: string; type: string; icon: string; title: string; meta: string; when: number; severity?: string }
  const items: ActivityItem[] = []

  for (const p of payments.slice(-50).reverse()) {
    const ts = Number(p.created_at ?? 0)
    const amt = Number(p.amount ?? 0)
    const status = p.status ?? "pending"
    let icon = "💰"
    let title = "Payment"
    let meta = `₹${amt}`
    if (status === "pending_approval") {
      icon = "⏳"
      title = "Payment Request"
      meta = `₹${amt} awaiting approval`
    } else if (status === "success") {
      icon = "✅"
      title = "Payment Approved"
      meta = `₹${amt} confirmed`
    } else if (status === "denied") {
      icon = "❌"
      title = "Payment Denied"
      meta = `₹${amt}`
    }
    items.push({ id: `pay-${p.id}`, type: "payment", icon, title, meta, when: ts })
  }

  for (const p of participants.slice(-30).reverse()) {
    const ts = Number(p.joinedAt ?? 0)
    const name = p.name ?? "Player"
    items.push({
      id: `part-${p.id ?? ts}`,
      type: "enrollment",
      icon: "🆕",
      title: "New Enrollment",
      meta: `${name} joined`,
      when: ts
    })
  }

  const users = Object.values(userStats) as any[]
  for (const u of users) {
    for (const h of (u.history ?? []).slice(-5).reverse()) {
      const d = h?.date ?? ""
      const score = h?.score ?? 0
      const total = h?.total ?? 0
      const ts = new Date(d).getTime() || 0
      if (ts > 0) {
        items.push({
          id: `quiz-${u.username}-${d}-${ts}`,
          type: "quiz",
          icon: "📝",
          title: "Quiz Completed",
          meta: `${u.username}: ${score}/${total}`,
          when: ts
        })
      }
    }
  }

  items.sort((a, b) => b.when - a.when)
  const recent = items.slice(0, 25).map((x) => ({
    ...x,
    whenLabel: formatWhen(x.when)
  }))

  return NextResponse.json({ ok: true, data: recent })
}

function formatWhen(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
  return new Date(ts).toLocaleDateString()
}

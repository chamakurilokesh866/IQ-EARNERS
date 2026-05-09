import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/orgAuth"
import { findOrgBySlug, listOrgAttempts, listOrgQuizzes } from "@/lib/enterpriseStore"

function csvEscape(s: string): string {
  const t = String(s ?? "").replace(/"/g, '""')
  return `"${t}"`
}

function escHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  if (!["owner", "admin", "teacher"].includes(auth.session.role)) {
    return NextResponse.json({ ok: false, error: "Insufficient role" }, { status: 403 })
  }
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  const url = new URL(req.url)
  const format = (url.searchParams.get("format") || "csv").toLowerCase()
  const quizFilter = url.searchParams.get("quizId")?.trim()

  const [attempts, quizzes] = await Promise.all([listOrgAttempts(org.id), listOrgQuizzes(org.id)])
  const titleById = new Map(quizzes.map((q) => [q.id, q.title]))
  const filtered = quizFilter ? attempts.filter((a) => a.quizId === quizFilter) : attempts

  if (format === "html") {
    const rows = filtered
      .slice()
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    const head = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Attempts — ${org.name}</title>
    <style>body{font-family:system-ui,sans-serif;background:#0a0f1a;color:#e2e8f0;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #334155;padding:8px;text-align:left}th{background:#1e293b}</style></head><body>`
    const tableHead = `<h1>Quiz attempts — ${escHtml(org.name)}</h1><p>Generated ${escHtml(new Date().toISOString())}</p><table><thead><tr>
    <th>Completed</th><th>Member</th><th>Member ID</th><th>Quiz</th><th>Score</th><th>Total</th><th>%</th><th>Time (s)</th></tr></thead><tbody>`
    const bodyRows = rows
      .map((a) => {
        const pct = a.total > 0 ? Math.round((a.score / a.total) * 1000) / 10 : 0
        return `<tr><td>${escHtml(a.completedAt)}</td><td>${escHtml(a.memberName)}</td><td>${escHtml(a.memberId)}</td><td>${escHtml(titleById.get(a.quizId) || a.quizId)}</td><td>${a.score}</td><td>${a.total}</td><td>${pct}</td><td>${a.timeSeconds}</td></tr>`
      })
      .join("")
    const html = `${head}${tableHead}${bodyRows}</tbody></table><p style="margin-top:24px;font-size:11px;color:#94a3b8">Print this page and use Save as PDF from your browser for a PDF copy.</p></body></html>`
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="attempts-${org.slug}.html"`,
      },
    })
  }

  const header = ["completedAt", "memberName", "memberId", "quizId", "quizTitle", "score", "total", "scorePct", "timeSeconds"]
  const lines = [header.join(",")]
  for (const a of filtered.sort((x, y) => new Date(y.completedAt).getTime() - new Date(x.completedAt).getTime())) {
    const pct = a.total > 0 ? Math.round((a.score / a.total) * 1000) / 10 : 0
    const title = titleById.get(a.quizId) || ""
    lines.push(
      [
        csvEscape(a.completedAt),
        csvEscape(a.memberName),
        csvEscape(a.memberId),
        csvEscape(a.quizId),
        csvEscape(title),
        a.score,
        a.total,
        pct,
        a.timeSeconds,
      ].join(",")
    )
  }
  const csv = lines.join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attempts-${org.slug}.csv"`,
    },
  })
}

import { NextResponse } from "next/server"
import { readRecentSecurityEvents } from "@/lib/securityEventLog"
import { requireAdminPermission } from "@/lib/auth"

export async function GET(req: Request) {
  const perm = await requireAdminPermission("security.view")
  if (!perm.ok) return NextResponse.json({ ok: false, error: perm.error }, { status: perm.status })
  const url = new URL(req.url)
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") || "200", 10) || 200))
  const type = (url.searchParams.get("type") || "").trim()
  const format = (url.searchParams.get("format") || "").trim().toLowerCase()
  const q = (url.searchParams.get("q") || "").trim().toLowerCase()
  let data = await readRecentSecurityEvents(limit)
  if (type) data = data.filter((e) => e.type === type)
  if (q) data = data.filter((e) => JSON.stringify(e).toLowerCase().includes(q))
  if (format === "csv") {
    const header = "t_iso,type,ip,path,detail\n"
    const rows = data.map((e) => {
      const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
      return [esc(new Date(e.t).toISOString()), esc(e.type), esc(e.ip ?? ""), esc(e.path ?? ""), esc(JSON.stringify(e.detail ?? {}))].join(",")
    })
    return new NextResponse(header + rows.join("\n"), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="security-events-${Date.now()}.csv"`,
      },
    })
  }
  return NextResponse.json({ ok: true, data, total: data.length })
}

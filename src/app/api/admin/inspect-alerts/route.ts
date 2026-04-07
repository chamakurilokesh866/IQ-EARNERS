import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getInspectAlerts, blockIp, getBlockedIps, unblockIp } from "@/lib/inspectSecurity"
import { audit } from "@/lib/audit"

export const dynamic = "force-dynamic"

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const alerts = await getInspectAlerts()
  const blocked = await getBlockedIps()
  return NextResponse.json({ ok: true, alerts, blocked })
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const action = body?.action
  if (action === "block" && body?.ip) {
    const ip = String(body.ip).trim()
    const ok = await blockIp(ip, body?.alertId)
    if (ok) await audit(req, "ip_blocked", { ip, alertId: body?.alertId })
    return NextResponse.json({ ok })
  }
  if (action === "unblock" && body?.ip) {
    const ip = String(body.ip).trim()
    const ok = await unblockIp(ip)
    if (ok) await audit(req, "ip_unblocked", { ip })
    return NextResponse.json({ ok })
  }
  return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
}

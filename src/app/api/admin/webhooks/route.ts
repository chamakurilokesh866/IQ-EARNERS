import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { generateWebhookSecret, getEnterpriseState, patchEnterpriseState, toPublicWebhook } from "@/lib/enterpriseStore"
import type { EnterpriseWebhook } from "@/lib/enterpriseState"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = await getEnterpriseState()
  return NextResponse.json({ ok: true, data: s.webhooks.map(toPublicWebhook) })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const url = String(body?.url ?? "").trim()
  const events = Array.isArray(body?.events) ? body.events.map(String) : []
  if (!url || !events.length) return NextResponse.json({ ok: false, error: "url and events required" }, { status: 400 })
  const { full, prefix, hash } = generateWebhookSecret()
  const row: EnterpriseWebhook = {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url,
    events,
    active: true,
    secretHash: hash,
    secretPrefix: prefix,
    failureCount: 0
  }
  const next = await patchEnterpriseState((s) => ({ ...s, webhooks: [...s.webhooks, row] }))
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })
  return NextResponse.json({ ok: true, data: { ...toPublicWebhook(row), secret: full } })
}

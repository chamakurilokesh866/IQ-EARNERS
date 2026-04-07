import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { generateApiKeyFull, getEnterpriseState, patchEnterpriseState, toPublicApiKey } from "@/lib/enterpriseStore"
import type { StoredApiKey } from "@/lib/enterpriseState"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = await getEnterpriseState()
  return NextResponse.json({ ok: true, data: s.apiKeys.map(toPublicApiKey) })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const name = String(body?.name ?? "").trim()
  if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 })
  const permissions = Array.isArray(body?.permissions) ? body.permissions.map(String) : []
  const rateLimit = Math.max(1, Math.min(100_000, Number(body?.rateLimit) || 100))
  const { full, prefix, hash } = generateApiKeyFull()
  const row: StoredApiKey = {
    id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    name,
    keyHash: hash,
    keyPrefix: prefix,
    permissions,
    rateLimit,
    requestsToday: 0,
    requestsMonth: 0,
    active: true,
    createdAt: new Date().toISOString(),
    usageDay: new Date().toISOString().slice(0, 10),
    usageMonth: new Date().toISOString().slice(0, 7)
  }
  const next = await patchEnterpriseState((s) => ({ ...s, apiKeys: [...s.apiKeys, row] }))
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })
  return NextResponse.json({ ok: true, data: { key: full, id: row.id } })
}

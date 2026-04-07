import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getEnterpriseState, patchEnterpriseState } from "@/lib/enterpriseStore"
import type { WhiteLabelPersisted } from "@/lib/enterpriseState"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = await getEnterpriseState()
  return NextResponse.json({ ok: true, data: s.whiteLabel })
}

export async function PUT(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 })
  }
  const incoming = body as Partial<WhiteLabelPersisted>
  const next = await patchEnterpriseState((s) => ({
    ...s,
    whiteLabel: { ...s.whiteLabel, ...incoming }
  }))
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })
  return NextResponse.json({ ok: true, data: next.whiteLabel })
}

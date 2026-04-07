import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { patchEnterpriseState } from "@/lib/enterpriseStore"

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const active = body?.active
  if (typeof active !== "boolean") {
    return NextResponse.json({ ok: false, error: "active boolean required" }, { status: 400 })
  }
  const next = await patchEnterpriseState((s) => ({
    ...s,
    apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, active } : k))
  }))
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

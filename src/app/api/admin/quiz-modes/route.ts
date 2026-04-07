import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getEnterpriseState, patchEnterpriseState } from "@/lib/enterpriseStore"
import { mergeQuizModesWithOverrides } from "@/lib/quizModeDefaults"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = await getEnterpriseState()
  const data = mergeQuizModesWithOverrides(s.quizModeOverrides)
  return NextResponse.json({ ok: true, data })
}

export async function PUT(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const id = String(body?.id ?? "").trim()
  const enabled = body?.enabled
  if (!id || typeof enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "id and enabled required" }, { status: 400 })
  }
  const next = await patchEnterpriseState((s) => ({
    ...s,
    quizModeOverrides: {
      ...s.quizModeOverrides,
      [id]: { ...s.quizModeOverrides[id], enabled }
    }
  }))
  if (!next) return NextResponse.json({ ok: false, error: "Save failed" }, { status: 500 })
  return NextResponse.json({ ok: true })
}

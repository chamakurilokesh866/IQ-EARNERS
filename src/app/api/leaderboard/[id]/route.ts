import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getLeaderboard, updateEntry, deleteEntry } from "@/lib/leaderboard"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.score !== undefined) updates.score = body.score
  if (body.totalTimeSeconds !== undefined) updates.totalTimeSeconds = body.totalTimeSeconds
  if (body.country !== undefined) updates.country = body.country
  const ok = await updateEntry(id, updates)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await params
  const ok = await deleteEntry(id)
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
}

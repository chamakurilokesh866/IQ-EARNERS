import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getTournaments, updateTournament, deleteTournament } from "@/lib/tournaments"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const ok = await updateTournament(id, body)
  return NextResponse.json(ok ? { ok: true } : { ok: false, error: "Failed" }, { status: ok ? 200 : 500 })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const { id } = await params
  const ok = await deleteTournament(id)
  return NextResponse.json(ok ? { ok: true } : { ok: false, error: "Failed" }, { status: ok ? 200 : 500 })
}

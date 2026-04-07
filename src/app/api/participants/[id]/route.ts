import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const DATA_PATH = path.join(process.cwd(), "src", "data", "participants.json")

async function readAll(): Promise<any[]> {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const arr = JSON.parse(txt)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeAll(arr: any[]): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true }).catch(() => {})
    await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Write failed"
    return { ok: false, message }
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  const arr = await readAll()
  const row = arr.find((t) => String(t.id) === String(id))
  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true, data: row })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  const arr = await readAll()
  const next = arr.filter((t) => String(t.id) !== String(id))
  const w = await writeAll(next)
  if (!w.ok) return NextResponse.json({ ok: false, error: w.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const arr = await readAll()
  const idx = arr.findIndex((t) => String(t.id) === String(id))
  if (idx === -1) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  arr[idx] = { ...arr[idx], ...body }
  const w = await writeAll(arr)
  if (!w.ok) return NextResponse.json({ ok: false, error: w.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { audit } from "../../../../lib/audit"
import { requireAdmin } from "@/lib/auth"

const DATA_PATH = path.join(process.cwd(), "src", "data", "prizes.json")

async function readAll(): Promise<any[]> {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const arr = JSON.parse(txt)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const id = params.id
  const body = await req.json().catch(() => ({}))
  const arr = await readAll()
  const idx = arr.findIndex((t) => t.id === id)
  if (idx === -1) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  arr[idx] = { ...arr[idx], ...body }
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
  await audit(req, "prizes.update", { id })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const id = params.id
  const arr = await readAll()
  const next = arr.filter((t) => t.id !== id)
  await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf-8")
  await audit(_req as any, "prizes.delete", { id })
  return NextResponse.json({ ok: true })
}

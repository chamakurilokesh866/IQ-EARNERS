import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin, getUid } from "@/lib/auth"

const DATA_PATH = path.join(process.cwd(), "src", "data", "participants.json")

async function ensureFile() {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, "[]", "utf-8")
  }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  await ensureFile()
  const txt = await fs.readFile(DATA_PATH, "utf-8")
  try {
    const data = JSON.parse(txt)
    const arr = Array.isArray(data) ? data : []
    let changed = false
    const normalized = arr.map((p: any) => {
      if (!p.id) { p.id = String(p.joinedAt ?? Date.now()); changed = true }
      if (!p.status) { p.status = "Active"; changed = true }
      return {
        ...p,
        ip: p.ip || "—"
      }
    })
    if (changed) await fs.writeFile(DATA_PATH, JSON.stringify(normalized, null, 2), "utf-8")
    return NextResponse.json({ ok: true, data: normalized })
  } catch {
    return NextResponse.json({ ok: true, data: [] })
  }
}

export async function POST(req: Request) {
  await ensureFile()
  const body = await req.json().catch(() => ({}))
  const current = JSON.parse(await fs.readFile(DATA_PATH, "utf-8"))
  if (Array.isArray(body?.items)) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    await fs.writeFile(DATA_PATH, JSON.stringify(body.items, null, 2), "utf-8")
    return NextResponse.json({ ok: true })
  }
  if (body?.item && typeof body.item.name === "string") {
    const auth = await requireAdmin()
    const uid = await getUid()
    if (!auth.ok && !uid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const item = {
      id: String(Date.now()),
      name: body.item.name,
      minutesAgo: Number.isFinite(Number(body.item.minutesAgo)) ? Number(body.item.minutesAgo) : 0,
      joinedAt: Date.now(),
      badge: typeof body.item.badge === "string" ? body.item.badge : undefined,
      status: "Active"
    }
    const next = [...(Array.isArray(current) ? current : []), item]
    await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf-8")
    return NextResponse.json({ ok: true, data: item })
  }
  return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
}

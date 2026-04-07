import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { audit } from "../../../lib/audit"
import { requireAdmin } from "@/lib/auth"

const DATA_PATH = path.join(process.cwd(), "src", "data", "prizes.json")

async function ensureFile() {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, "[]", "utf-8")
  }
}

export async function GET(req: Request) {
  await ensureFile()
  const { searchParams } = new URL(req.url)
  const typeFilter = searchParams.get("type")
  const tournamentId = searchParams.get("tournamentId")
  const content = await fs.readFile(DATA_PATH, "utf-8")
  try {
    let data = JSON.parse(content)
    if (!Array.isArray(data)) data = []
    if (typeFilter === "prize" || typeFilter === "voucher") {
      data = data.filter((i: any) => (i.type ?? "prize") === typeFilter)
    }
    if (tournamentId) {
      data = data.filter((i: any) => i.tournamentId === tournamentId)
    }
    return NextResponse.json({ ok: true, data }, {
      headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
    })
  } catch {
    return NextResponse.json({ ok: true, data: [] }, {
      headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
    })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  await ensureFile()
  const body = await req.json().catch(() => ({}))
  const current = JSON.parse(await fs.readFile(DATA_PATH, "utf-8"))
  if (Array.isArray(body?.items)) {
    const items = body.items
    const valid = items.every((i: any) => typeof i?.title === "string")
    if (!valid) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
    await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2), "utf-8")
    await audit(req, "prizes.replace", { count: Array.isArray(items) ? items.length : 0 })
    return NextResponse.json({ ok: true })
  }
  if (body?.item && typeof body.item.title === "string") {
    const item = body.item
    if (!item.id) item.id = String(Date.now())
    const next = [...current, item]
    await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf-8")
    await audit(req, "prizes.add", { id: item.id })
    return NextResponse.json({ ok: true, id: item.id })
  }
  return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
}

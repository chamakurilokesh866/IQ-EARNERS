import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requirePaidUser } from "@/lib/auth"

const DATA_PATH = path.join(process.cwd(), "src", "data", "prizes.json")

async function readAll() {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    return JSON.parse(txt)
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  const user = await requirePaidUser()
  if (!user.ok) return NextResponse.json({ ok: false, error: user.error }, { status: user.status })
  const body = await req.json().catch(() => ({}))
  const id = body?.id
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  const items = await readAll()
  const idx = items.findIndex((i: any) => i.id === id)
  if (idx === -1) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const it = items[idx]
  if (typeof it.spotsLeft === "number" && it.spotsLeft > 0) {
    it.spotsLeft -= 1
  }
  items[idx] = it
  await fs.writeFile(DATA_PATH, JSON.stringify(items, null, 2), "utf-8")
  return NextResponse.json({ ok: true, item: it })
}

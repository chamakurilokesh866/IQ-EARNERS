import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "payments.json")

const USERNAME_ALLOWED = /^[A-Za-z0-9._\-@]{3,20}$/

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const name = String(body?.meta?.name ?? body?.name ?? "").trim().slice(0, 32)
  if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 })
  if (!USERNAME_ALLOWED.test(name)) {
    return NextResponse.json({ ok: false, error: "Invalid username: 3–20 chars" }, { status: 400 })
  }

  const txt = await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]")
  let arr: any[] = []
  try {
    arr = JSON.parse(txt)
  } catch {
    arr = []
  }
  const idx = arr.findIndex((p: any) => p.id === id)
  if (idx === -1) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  arr[idx].meta = { ...(arr[idx].meta || {}), name }
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
  return NextResponse.json({ ok: true })
}

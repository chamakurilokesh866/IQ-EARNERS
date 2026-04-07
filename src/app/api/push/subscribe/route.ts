import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "push_subscriptions.json")

async function ensureFile() {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, "[]", "utf-8")
  }
}

export async function POST(req: Request) {
  await ensureFile()
  const body = await req.json().catch(() => ({}))
  const sub = body?.subscription
  if (!sub || !sub.endpoint) return NextResponse.json({ ok: false, error: "Invalid subscription" }, { status: 400 })
  const txt = await fs.readFile(DATA_PATH, "utf-8")
  const arr = JSON.parse(txt || "[]")
  const exists = arr.find((s: any) => s.endpoint === sub.endpoint)
  if (!exists) arr.push(sub)
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
  return NextResponse.json({ ok: true })
}

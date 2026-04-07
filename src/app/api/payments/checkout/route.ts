import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

const DATA_PATH = path.join(process.cwd(), "src", "data", "payments.json")

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
  const amount = Number(body?.amount ?? 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 })
  }
  const session_id = crypto.randomBytes(16).toString("hex")
  const txt = await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]")
  const arr = JSON.parse(txt || "[]")
  const entry = { id: String(Date.now()), session_id, amount, type: "tournament", status: "pending", created_at: Date.now(), meta: body?.meta ?? {} }
  arr.push(entry)
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
  return NextResponse.json({ ok: true, session_id })
}

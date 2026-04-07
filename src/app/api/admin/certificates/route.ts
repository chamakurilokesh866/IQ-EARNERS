import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "src", "data")
const CERTS_PATH = path.join(DATA_DIR, "certificates.json")

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const txt = await fs.readFile(CERTS_PATH, "utf-8").catch(() => "[]")
  const data = JSON.parse(txt || "[]")
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username ?? "").trim()
  const rawType = body?.type
  const type = rawType === "runner_up" || rawType === "participation" ? rawType : "first"
  const tournamentTitle = String(body?.tournamentTitle ?? body?.tournamentName ?? "Quiz Tournament").trim()

  if (!username) return NextResponse.json({ ok: false, error: "Username required" }, { status: 400 })

  const certs = JSON.parse(await fs.readFile(CERTS_PATH, "utf-8").catch(() => "[]"))
  const entry = {
    id: String(Date.now()),
    username,
    type: type === "first" ? "1st" : type === "runner_up" ? "runner_up" : "participation",
    tournamentTitle,
    issuedAt: Date.now()
  }
  certs.push(entry)
  await fs.writeFile(CERTS_PATH, JSON.stringify(certs, null, 2), "utf-8")
  return NextResponse.json({ ok: true, id: entry.id })
}

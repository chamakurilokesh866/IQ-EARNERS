import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"

const CERTS_PATH = path.join(process.cwd(), "src", "data", "certificates.json")

function parseUsernames(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  try {
    if (trimmed.startsWith("[")) {
      const arr = JSON.parse(trimmed)
      if (Array.isArray(arr)) {
        return arr.map((x: any) => String(x?.username ?? x?.name ?? x ?? "").trim()).filter(Boolean)
      }
    }
    if (trimmed.startsWith("{")) {
      const obj = JSON.parse(trimmed)
      if (Array.isArray(obj.usernames)) return obj.usernames.map((x: any) => String(x).trim()).filter(Boolean)
      if (Array.isArray(obj.names)) return obj.names.map((x: any) => String(x).trim()).filter(Boolean)
    }
  } catch {}
  const lines = trimmed.split(/[\n,;]/)
  return [...new Set(lines.map((l) => l.split(/[\t,]/)[0]?.trim()).filter(Boolean))]
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const raw = body?.raw ?? body?.text ?? body?.csv ?? body?.json ?? ""
  const tournamentTitle = String(body?.tournamentTitle ?? body?.tournamentName ?? "Quiz Tournament").trim()

  const usernames = parseUsernames(typeof raw === "string" ? raw : JSON.stringify(raw))
  if (!usernames.length) return NextResponse.json({ ok: false, error: "No usernames found" }, { status: 400 })

  const certs = JSON.parse(await fs.readFile(CERTS_PATH, "utf-8").catch(() => "[]"))
  const now = Date.now()
  for (let i = 0; i < usernames.length; i++) {
    certs.push({
      id: String(now + i),
      username: usernames[i],
      type: "participation",
      tournamentTitle,
      issuedAt: now
    })
  }
  await fs.writeFile(CERTS_PATH, JSON.stringify(certs, null, 2), "utf-8")
  return NextResponse.json({ ok: true, count: usernames.length })
}

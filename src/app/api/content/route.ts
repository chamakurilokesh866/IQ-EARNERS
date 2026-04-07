import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const DATA_PATH = path.join(process.cwd(), "src", "data", "content.json")

async function ensureFile() {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    const initial = {
      hero: { title: "Tournament", description: "Join and test your knowledge!" },
      rules: [
        { title: "Fair Play Only", desc: "No unfair practices. Cheating results in disqualification.", icon: "🛡️" },
        { title: "Time Limits", desc: "Each question has a 30-second time limit.", icon: "⏳" },
        { title: "Single Attempt", desc: "One attempt per participant. Restart not allowed.", icon: "🔁" }
      ]
    }
    await fs.writeFile(DATA_PATH, JSON.stringify(initial, null, 2), "utf-8")
  }
}

export async function GET() {
  await ensureFile()
  const txt = await fs.readFile(DATA_PATH, "utf-8")
  try {
    const data = JSON.parse(txt)
    return NextResponse.json({ ok: true, data }, {
      headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" }
    })
  } catch {
    return NextResponse.json({ ok: true, data: {} }, {
      headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" }
    })
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  await ensureFile()
  const body = await req.json().catch(() => ({}))
  const current = JSON.parse(await fs.readFile(DATA_PATH, "utf-8"))
  const next = { ...current, ...body }
  await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf-8")
  return NextResponse.json({ ok: true })
}

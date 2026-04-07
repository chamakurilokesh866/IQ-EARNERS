import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

/** Same file as admin notices — public read only for in-app banner (no /api/admin path). */
const DATA_PATH = path.join(process.cwd(), "src", "data", "admin_notices.json")

export async function GET() {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const data = JSON.parse(txt || "[]")
    return NextResponse.json(
      { ok: true, data: Array.isArray(data) ? data : [] },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } }
    )
  } catch {
    return NextResponse.json({ ok: true, data: [] }, { headers: { "Cache-Control": "public, max-age=15" } })
  }
}

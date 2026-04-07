import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "reports.json")

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const txt = await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]")
  const data = JSON.parse(txt || "[]")
  return NextResponse.json({ ok: true, data })
}

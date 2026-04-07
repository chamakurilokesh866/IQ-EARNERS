import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { cookies } from "next/headers"

const DATA_PATH = path.join(process.cwd(), "src", "data", "question-feedback.json")

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

export async function GET() {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return NextResponse.json({ ok: true, data: arr })
  } catch {
    return NextResponse.json({ ok: true, data: [] })
  }
}

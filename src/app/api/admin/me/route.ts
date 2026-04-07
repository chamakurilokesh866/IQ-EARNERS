import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { clearCookieOptions } from "@/lib/cookieOptions"
import { promises as fs } from "fs"
import path from "path"

const LOCK_FILE = path.join(process.cwd(), "src", "data", "admin-lock.json")

async function readLock(): Promise<{ lockedUntil: number }> {
  try {
    const txt = await fs.readFile(LOCK_FILE, "utf-8")
    const d = JSON.parse(txt)
    return { lockedUntil: Number(d.lockedUntil) || 0 }
  } catch {
    return { lockedUntil: 0 }
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const role = cookieStore.get("role")?.value
  const now = Date.now()
  const { lockedUntil } = await readLock()
  const locked = lockedUntil > now
  if (locked) {
    const res = NextResponse.json({ ok: true, admin: false, locked: true, lockedUntil })
    res.cookies.set("role", "", clearCookieOptions())
    return res
  }
  const isAdmin = role === "admin"
  const slug = process.env.ADMIN_DASHBOARD_SLUG?.trim() || "admin"
  const dashboardPath = isAdmin ? `/a/${slug}` : undefined
  return NextResponse.json({ ok: true, admin: isAdmin, dashboardPath })
}

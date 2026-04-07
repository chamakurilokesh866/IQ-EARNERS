import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { cookies } from "next/headers"

const DATA_PATH = path.join(process.cwd(), "src", "data", "referrals.json")
const PROFILES = path.join(process.cwd(), "src", "data", "profiles.json")

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

async function readProfiles(): Promise<any[]> {
  try {
    const txt = await fs.readFile(PROFILES, "utf-8")
    return JSON.parse(txt || "[]")
  } catch {
    return []
  }
}

export async function GET() {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const [referrals, profiles] = await Promise.all([
    fs.readFile(DATA_PATH, "utf-8").then((t) => JSON.parse(t || "[]")).catch(() => []),
    readProfiles()
  ])
  const profileByUid = Object.fromEntries((profiles as any[]).map((p) => [p.uid, p]))
  const enriched = (referrals as any[]).map((r) => ({
    ...r,
    referrerName: profileByUid[r.referrerUid]?.username ?? r.referrerUid?.slice(0, 8) + "…",
    referredName: profileByUid[r.referredUid]?.username ?? (r.referredUid ? r.referredUid.slice(0, 8) + "…" : "Visitor")
  }))
  return NextResponse.json({ ok: true, data: enriched })
}

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "challenge-acceptances.json")

export async function GET() {
  const cookieStore = await cookies()
  let username = ""
  try {
    username = decodeURIComponent(cookieStore.get("username")?.value ?? "")
  } catch {}
  if (!username) {
    try {
      const profiles = await fs.readFile(path.join(process.cwd(), "src", "data", "profiles.json"), "utf-8").catch(() => "[]")
      const arr = JSON.parse(profiles || "[]")
      const uid = cookieStore.get("uid")?.value ?? ""
      const me = arr.find((p: any) => p.uid === uid)
      if (me?.username) username = me.username
    } catch {}
  }
  if (!username) return NextResponse.json({ ok: true, data: [] })

  const nameLower = username.toLowerCase()
  const data = JSON.parse(await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]"))
  const mine = data.filter((x: any) => String(x?.challengerUsername ?? "").toLowerCase() === nameLower)
  return NextResponse.json({
    ok: true,
    data: mine.map((x: any) => ({ friendUsername: x.friendUsername, challenge: x.challenge }))
  })
}

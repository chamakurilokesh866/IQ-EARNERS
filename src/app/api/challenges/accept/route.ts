import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "challenge-acceptances.json")

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const fromUsername = String(body?.from ?? "").trim()
  const challenge = String(body?.challenge ?? "").trim()
  if (!fromUsername || !challenge) return NextResponse.json({ ok: false, error: "from and challenge required" }, { status: 400 })

  const cookieStore = await cookies()
  let friendUsername = ""
  try {
    friendUsername = decodeURIComponent(cookieStore.get("username")?.value ?? "")
  } catch {}
  if (!friendUsername) {
    try {
      const profiles = await fs.readFile(path.join(process.cwd(), "src", "data", "profiles.json"), "utf-8").catch(() => "[]")
      const arr = JSON.parse(profiles || "[]")
      const uid = cookieStore.get("uid")?.value ?? ""
      const me = arr.find((p: any) => p.uid === uid)
      if (me?.username) friendUsername = me.username
    } catch {}
  }
  if (!friendUsername) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 })

  const data = JSON.parse(await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]"))
  data.push({
    id: String(Date.now()),
    challengerUsername: fromUsername,
    friendUsername,
    challenge,
    acceptedAt: Date.now()
  })
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8")
  return NextResponse.json({ ok: true })
}

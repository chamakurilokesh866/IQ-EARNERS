import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "notices.json")

export type Notice = {
  id: string
  title: string
  body: string
  url?: string
  created_at: number
}

async function readNotices(): Promise<Notice[]> {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeNotices(arr: Notice[]): Promise<void> {
  const dir = path.dirname(DATA_PATH)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
}

export async function GET() {
  const arr = await readNotices()
  const latest = arr.length ? arr[arr.length - 1] : null
  if (!latest) return NextResponse.json({ ok: true, data: null })
  return NextResponse.json({
    ok: true,
    data: {
      id: latest.id,
      title: latest.title,
      body: latest.body,
      url: latest.url,
      created_at: latest.created_at
    }
  })
}

export async function POST(req: Request) {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const title = String(body?.title ?? "").trim().slice(0, 120)
  const noticeBody = String(body?.body ?? "").trim().slice(0, 300)
  if (!title) return NextResponse.json({ ok: false, error: "Title required" }, { status: 400 })
  const url = typeof body?.url === "string" ? body.url.trim().slice(0, 200) : undefined
  const arr = await readNotices()
  const notice: Notice = {
    id: `n-${Date.now()}`,
    title: title || "Announcement",
    body: noticeBody || "",
    url: url || undefined,
    created_at: Date.now()
  }
  arr.push(notice)
  await writeNotices(arr)
  return NextResponse.json({ ok: true, data: notice })
}

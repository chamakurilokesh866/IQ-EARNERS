import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"
import { audit } from "../../../../lib/audit"

const SUBS_PATH = path.join(process.cwd(), "src", "data", "push_subscriptions.json")

async function ensureSubs(): Promise<any[]> {
  try {
    const txt = await fs.readFile(SUBS_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const title = typeof body?.title === "string" ? body.title : "Quiz Available"
  const message = typeof body?.body === "string" ? body.body : "Your quiz is ready"
  const url = typeof body?.url === "string" ? body.url : "/daily-quiz"
  const subs = await ensureSubs()
  if (!subs.length) return NextResponse.json({ ok: true, sent: 0, message: "No subscriptions" })

  const vapidPublic = process.env.VAPID_PUBLIC_KEY ?? ""
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? ""
  if (!vapidPublic || !vapidPrivate) {
    await audit(req, "push.send.requested", { count: subs.length })
    return NextResponse.json({ ok: true, sent: 0, error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.local" })
  }

  type WebPush = { setVapidDetails: (a: string, b: string, c: string) => void; sendNotification: (sub: any, payload: string, opts?: { TTL?: number }) => Promise<void> }
  let webpush: WebPush | null = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webpush = require("web-push") as WebPush
    webpush.setVapidDetails("mailto:admin@example.com", vapidPublic, vapidPrivate)
  } catch {
    return NextResponse.json({ ok: true, sent: 0, error: "web-push not installed. Run: npm install web-push" })
  }
  if (!webpush) return NextResponse.json({ ok: true, sent: 0, error: "web-push not available" })

  await audit(req, "push.send.requested", { count: subs.length })
  const payload = JSON.stringify({ title, body: message, url: url || "/home", tag: `iq-${Date.now()}` })
  let sent = 0
  const failed: string[] = []
  for (const sub of subs) {
    try {
      await webpush!.sendNotification(sub, payload, { TTL: 60 })
      sent++
    } catch (e: any) {
      if (e?.statusCode === 410 || e?.statusCode === 404) failed.push(sub?.endpoint ?? "")
    }
  }
  if (failed.length) {
    try {
      const remaining = subs.filter((s: any) => !failed.includes(s?.endpoint ?? ""))
      await fs.writeFile(SUBS_PATH, JSON.stringify(remaining, null, 2), "utf-8")
    } catch {}
  }
  return NextResponse.json({ ok: true, sent })
}

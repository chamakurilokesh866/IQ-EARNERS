import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfiles } from "@/lib/profiles"
import { sendEmail } from "@/lib/email"

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

/** POST: Send a broadcast email to all users with an email address.
 * Body: { subject: string, body: string } – HTML supported in body.
 */
export async function POST(req: Request) {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  let payload: { subject?: string; body?: string }
  try {
    payload = await req.json().catch(() => ({}))
  } catch {
    payload = {}
  }
  const subject = String(payload.subject ?? "").trim()
  const body = String(payload.body ?? "").trim()
  if (!subject) return NextResponse.json({ ok: false, error: "Subject is required" }, { status: 400 })
  if (!body) return NextResponse.json({ ok: false, error: "Message body is required" }, { status: 400 })

  const profiles = await getProfiles()
  const emails = Array.from(
    new Set(
      profiles
        .map((p) => (typeof p.email === "string" ? p.email.trim() : ""))
        .filter((e) => e && e.includes("@"))
    )
  )
  if (emails.length === 0) {
    return NextResponse.json({ ok: false, error: "No user emails found" }, { status: 400 })
  }

  const html = `<p>${body.replace(/\n/g, "<br/>")}</p>`
  const text = body

  const chunkSize = 50
  let sentCount = 0
  const errors: string[] = []
  for (let i = 0; i < emails.length; i += chunkSize) {
    const chunk = emails.slice(i, i + chunkSize)
    const res = await sendEmail({ to: chunk, subject, html, text })
    if (res.ok) {
      sentCount += chunk.length
    } else if (res.error) {
      errors.push(res.error)
      // If send completely fails (e.g. not configured), stop early
      if (res.error.toLowerCase().includes("not configured")) break
    }
  }

  if (sentCount === 0 && errors.length) {
    return NextResponse.json({ ok: false, error: errors[0] }, { status: 502 })
  }

  return NextResponse.json({ ok: true, sent: sentCount, errors: errors.length ? errors : undefined })
}


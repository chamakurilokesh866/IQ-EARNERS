import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { promises as fs } from "fs"
import path from "path"
import { sendEmail } from "@/lib/email"
import { getProfileByUsername } from "@/lib/profiles"
import { buildCertificateReadyEmailHtml } from "@/lib/orgMemberInviteEmail"

const DATA_DIR = path.join(process.cwd(), "src", "data")
const CERTS_PATH = path.join(DATA_DIR, "certificates.json")

export type StoredCertificate = {
  id: string
  username: string
  type: "1st" | "runner_up" | "participation"
  tournamentTitle: string
  issuedAt: number
  /** When false, the learner does not see this until an admin approves. Omitted on legacy rows = treated as approved. */
  approved?: boolean
  emailSentAt?: number | null
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const txt = await fs.readFile(CERTS_PATH, "utf-8").catch(() => "[]")
  const data = JSON.parse(txt || "[]") as StoredCertificate[]
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username ?? "").trim()
  const rawType = body?.type
  const type = rawType === "runner_up" || rawType === "participation" ? rawType : "first"
  const tournamentTitle = String(body?.tournamentTitle ?? body?.tournamentName ?? "Quiz Tournament").trim()

  if (!username) return NextResponse.json({ ok: false, error: "Username required" }, { status: 400 })

  const certs = JSON.parse(await fs.readFile(CERTS_PATH, "utf-8").catch(() => "[]")) as StoredCertificate[]
  const entry: StoredCertificate = {
    id: String(Date.now()),
    username,
    type: type === "first" ? "1st" : type === "runner_up" ? "runner_up" : "participation",
    tournamentTitle,
    issuedAt: Date.now(),
    approved: false,
    emailSentAt: null,
  }
  certs.push(entry)
  await fs.writeFile(CERTS_PATH, JSON.stringify(certs, null, 2), "utf-8")
  return NextResponse.json({ ok: true, id: entry.id, data: entry })
}

/** Approve a pending certificate and optionally email the user (never sends without admin action). */
export async function PATCH(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const id = String(body?.id ?? "").trim()
  const action = String(body?.action ?? "approve")
  const sendMail = Boolean(body?.sendEmail)
  if (!id || action !== "approve") {
    return NextResponse.json({ ok: false, error: "id and action=approve required" }, { status: 400 })
  }

  const certs = JSON.parse(await fs.readFile(CERTS_PATH, "utf-8").catch(() => "[]")) as StoredCertificate[]
  const idx = certs.findIndex((c) => c.id === id)
  if (idx < 0) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  const row = { ...certs[idx], approved: true }
  let emailSentAt = row.emailSentAt ?? null

  if (sendMail) {
    const profile = await getProfileByUsername(row.username)
    const email = typeof profile?.email === "string" ? profile.email.trim() : ""
    if (email.includes("@")) {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.iqearners.online"
      const dashboardUrl = `${base.replace(/\/$/, "")}/user?highlight=certificates`
      const displayName = String(profile?.username ?? row.username)
      const mailed = await sendEmail({
        to: email,
        subject: `Certificate ready: ${row.tournamentTitle}`,
        html: buildCertificateReadyEmailHtml({
          displayName,
          dashboardUrl,
          tournamentTitle: row.tournamentTitle,
        }),
        text: [
          `Hello ${displayName},`,
          "",
          `Your certificate for "${row.tournamentTitle}" has been approved.`,
          `Download it from your dashboard: ${dashboardUrl}`,
        ].join("\n"),
      })
      if (mailed.ok) emailSentAt = Date.now()
    }
  }

  certs[idx] = { ...row, emailSentAt }
  await fs.writeFile(CERTS_PATH, JSON.stringify(certs, null, 2), "utf-8")
  return NextResponse.json({ ok: true, data: certs[idx] })
}

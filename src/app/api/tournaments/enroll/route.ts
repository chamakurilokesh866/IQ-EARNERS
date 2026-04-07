import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { getProfileByUid } from "@/lib/profiles"
import { addPayment } from "@/lib/payments"
import { getSettings } from "@/lib/settings"
import { getTournaments } from "@/lib/tournaments"
import { isEnrolled } from "@/lib/enrollments"

const DATA_DIR = path.join(process.cwd(), "src", "data")

async function readJson<T>(p: string, fallback: T): Promise<T> {
  try {
    const txt = await fs.readFile(p, "utf-8")
    return JSON.parse(txt || "null") ?? fallback
  } catch {
    return fallback
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const tournamentId = body?.tournamentId && String(body.tournamentId).trim()
  if (!tournamentId) return NextResponse.json({ ok: false, error: "tournamentId required" }, { status: 400 })

  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  let username = ""
  try { username = decodeURIComponent(cookieStore.get("username")?.value ?? "") } catch {}
  if (!username && uid) {
    const me = await getProfileByUid(uid)
    if (me?.username) username = me.username
  }
  if (!username) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 })

  const [settings, tournaments] = await Promise.all([getSettings(), getTournaments()])
  const round = Number(settings.round ?? 1)
  const tournament = tournaments.find((t: any) => t.id === tournamentId)
  if (!tournament) return NextResponse.json({ ok: false, error: "Tournament not found" }, { status: 404 })

  const rawFee = (tournament as any).fee ?? (tournament as any).entryFee ?? settings.entryFee ?? 100
  const fee = Number(rawFee) || (typeof rawFee === "string" ? parseInt(String(rawFee).replace(/\D/g, "") || "100", 10) : 100)
  if (!Number.isFinite(fee) || fee < 0) return NextResponse.json({ ok: false, error: "Invalid tournament fee" }, { status: 400 })

  const taken = await isEnrolled(username, tournamentId)
  if (taken) return NextResponse.json({ ok: false, error: "Already enrolled in this tournament" }, { status: 400 })

  if (round === 1) {
    return NextResponse.json({ ok: false, error: "Tournament enrollment opens after Round 1 prize completion" }, { status: 400 })
  }

  // Per-tournament payment: manual/token flow – no prior platform fee required
  const manualApproval = body?.manual === true
  const paymentKey = body?.paymentKey && String(body.paymentKey).trim() ? String(body.paymentKey).trim().slice(0, 10) : undefined

  const id = String(Date.now())
  if (manualApproval) {
    const meta = { paymentKey: paymentKey || undefined, username, tournamentId }
    const ok = await addPayment({
      id,
      amount: fee,
      type: "tournament_entry",
      status: "pending_approval",
      created_at: Date.now(),
      meta
    } as any)
    if (!ok) {
      try {
        const current = await readJson<any[]>(path.join(DATA_DIR, "payments.json"), [])
        current.push({ id, amount: fee, type: "tournament_entry", status: "pending_approval", created_at: Date.now(), tournamentId, meta })
        await fs.writeFile(path.join(DATA_DIR, "payments.json"), JSON.stringify(current, null, 2), "utf-8")
      } catch {}
    }
    return NextResponse.json({ ok: true, id, status: "pending_approval" })
  }

  const token = crypto.randomBytes(24).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const expiresAt = Date.now() + 15 * 60 * 1000
  const meta = { username, tournamentId, confirm_token_hash: tokenHash, confirm_expires_at: expiresAt }
  const ok = await addPayment({
    id,
    amount: fee,
    type: "tournament_entry",
    status: "pending",
    created_at: Date.now(),
    meta
  } as any)
  if (!ok) {
    try {
      const current = await readJson<any[]>(path.join(DATA_DIR, "payments.json"), [])
      current.push({ id, amount: fee, type: "tournament_entry", status: "pending", created_at: Date.now(), tournamentId, meta: { username, tournamentId }, confirm_token_hash: tokenHash, confirm_expires_at: expiresAt })
      await fs.writeFile(path.join(DATA_DIR, "payments.json"), JSON.stringify(current, null, 2), "utf-8")
    } catch {}
  }
  return NextResponse.json({ ok: true, id, status: "pending", token })
}

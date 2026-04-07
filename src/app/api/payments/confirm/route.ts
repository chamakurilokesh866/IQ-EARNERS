import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { rateLimit } from "@/lib/rateLimit"
import { validateOrigin } from "@/lib/auth"
import { findPayment, updatePayment } from "@/lib/payments"
import { upsertByName } from "@/lib/leaderboard"
import { addEnrollment, isEnrolled } from "@/lib/enrollments"
import { generateEnrollmentCode } from "@/lib/enrollmentCode"

const DATA_PATH = path.join(process.cwd(), "src", "data", "payments.json")

export async function POST(req: Request) {
  const originCheck = validateOrigin(req)
  if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  const body = await req.json().catch(() => ({}))
  const id = body?.id
  const token = body?.token
  if (!id || !token) return NextResponse.json({ ok: false, error: "Missing id or token" }, { status: 400 })

  let rec: any = await findPayment({ paymentId: id })
  if (!rec) {
    const txt = await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]")
    let arr: any[] = []
    try { arr = JSON.parse(txt) } catch { arr = [] }
    const idx = arr.findIndex((p) => p.id === id)
    if (idx === -1) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
    rec = arr[idx]
  }
  if (rec.status === "success") return NextResponse.json({ ok: true })
  const confirmExpires = rec.confirm_expires_at ?? (rec.meta as any)?.confirm_expires_at
  const confirmHash = rec.confirm_token_hash ?? (rec.meta as any)?.confirm_token_hash
  if (typeof confirmExpires === "number" && confirmExpires < Date.now()) {
    return NextResponse.json({ ok: false, error: "Token expired" }, { status: 400 })
  }
  const h = crypto.createHash("sha256").update(String(token)).digest("hex")
  if (h !== confirmHash) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 })

  const ok = await updatePayment(id, { status: "success", confirmed_at: Date.now() })
  if (!ok) {
    const txt = await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]")
    let arr: any[] = []
    try { arr = JSON.parse(txt) } catch { arr = [] }
    const idx = arr.findIndex((p) => p.id === id)
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], status: "success", confirmed_at: Date.now() }
      delete arr[idx].confirm_token_hash
      delete arr[idx].confirm_expires_at
      await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
    }
  }

  const tournamentId = rec.tournamentId ?? (rec.meta as any)?.tournamentId
  if (rec?.type === "tournament_entry" && tournamentId) {
    try {
      const PARTICIPANTS = path.join(process.cwd(), "src", "data", "participants.json")
      const username = (rec?.meta as any)?.name ?? (rec?.meta as any)?.username ?? ""
      if (username) {
        const alreadyEnrolled = await isEnrolled(username, tournamentId)
        if (!alreadyEnrolled) {
          await addEnrollment({
            username,
            tournamentId,
            paidAt: Date.now(),
            uniqueCode: generateEnrollmentCode(tournamentId)
          })
        }
        await upsertByName({ name: username, score: 0, tournamentId })
        const ptxt = await fs.readFile(PARTICIPANTS, "utf-8").catch(() => "[]")
        const participants: any[] = JSON.parse(ptxt || "[]")
        if (!participants.some((p: any) => String(p?.name ?? "").toLowerCase() === username.toLowerCase())) {
          const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "0.0.0.0"
          participants.push({ id: String(Date.now()), name: username, joinedAt: Date.now(), status: "Active", ip })
          await fs.writeFile(PARTICIPANTS, JSON.stringify(participants, null, 2), "utf-8")
        }
      }
    } catch { }
  }

  // Referral credit only when referred user has paid AND created username (POST /api/referrals from create-username)

  return NextResponse.json({ ok: true })
}

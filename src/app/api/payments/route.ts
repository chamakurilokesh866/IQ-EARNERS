import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { cookies } from "next/headers"
import { requireAdmin, validateOrigin } from "@/lib/auth"
import { rateLimit } from "@/lib/rateLimit"

const DATA_PATH = path.join(process.cwd(), "src", "data", "payments.json")
const SETTINGS_PATH = path.join(process.cwd(), "src", "data", "settings.json")

async function ensureFile() {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, "[]", "utf-8")
  }
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  await ensureFile()
  const txt = await fs.readFile(DATA_PATH, "utf-8")
  try {
    const data = JSON.parse(txt)
    return NextResponse.json({ ok: true, data: Array.isArray(data) ? data : [] })
  } catch {
    return NextResponse.json({ ok: true, data: [] })
  }
}

export async function POST(req: Request) {
  const originCheck = validateOrigin(req)
  if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  await ensureFile()
  const body = await req.json().catch(() => ({}))
  // Load server-side fee to avoid tampering
  const sTxt = await fs.readFile(SETTINGS_PATH, "utf-8").catch(() => "{}")
  let entryFee = 100
  try {
    const s = JSON.parse(sTxt || "{}")
    entryFee = Number(s?.entryFee ?? 100)
    if (!Number.isFinite(entryFee) || entryFee <= 0) entryFee = 100
  } catch {}
  const amount = Number(body?.amount ?? entryFee)
  const type = typeof body?.type === "string" ? body.type : "tournament"
  if (!Number.isFinite(amount) || amount <= 0 || amount !== entryFee) {
    return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 })
  }
  // Normalize and sanitize meta
  const manualApproval = body?.manual === true
  const paymentKey = body?.paymentKey && String(body.paymentKey).trim() ? String(body.paymentKey).trim().slice(0, 10) : undefined

  if (manualApproval) {
    const meta: any = { paymentKey: paymentKey || undefined }
    const currentTxt = await fs.readFile(DATA_PATH, "utf-8")
    const current = JSON.parse(currentTxt || "[]")
    const id = String(Date.now())
    const entry = {
      id,
      amount,
      type,
      status: "pending_approval",
      created_at: Date.now(),
      meta
    }
    const next = [...(Array.isArray(current) ? current : []), entry]
    await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf-8")
    return NextResponse.json({ ok: true, id })
  }

  const method = body?.meta?.method === "Card" ? "Card" : "UPI"
  const upiApp = body?.meta?.upiApp === "PhonePe" ? "PhonePe" : body?.meta?.upiApp === "Paytm" ? "Paytm" : "GPay"
  const rawName = String(body?.meta?.name ?? "").slice(0, 80)
  const name = rawName.replace(/[^\w\s.-]/g, "").trim()
  const rawDetails = String(body?.meta?.details ?? "").slice(0, 120).trim()
  let meta: any = { method, upiApp, name }
  if (method === "UPI") {
    const m = rawDetails.match(/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z0-9.\-_]{2,}$/)
    const masked = m ? `${rawDetails.slice(0, 2)}***@${rawDetails.split("@")[1]}` : "invalid"
    meta.upiMasked = masked
  } else {
    const last4 = (rawDetails.match(/\d{4}$/)?.[0] ?? "").slice(-4)
    meta.cardLast4 = last4 || "0000"
  }
  const currentTxt = await fs.readFile(DATA_PATH, "utf-8")
  const current = JSON.parse(currentTxt || "[]")
  const id = String(Date.now())
  const token = crypto.randomBytes(24).toString("hex")
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const entry = {
    id,
    amount,
    type,
    status: "pending",
    created_at: Date.now(),
    meta,
    confirm_token_hash: tokenHash,
    confirm_expires_at: Date.now() + 15 * 60 * 1000
  }
  const next = [...(Array.isArray(current) ? current : []), entry]
  await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf-8")
  // Referral credit only when referred user has paid AND created username (POST /api/referrals from create-username)
  return NextResponse.json({ ok: true, id, status: "pending", token })
}

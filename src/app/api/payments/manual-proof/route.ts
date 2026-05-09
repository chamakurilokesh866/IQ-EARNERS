import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"
import { getSettings } from "@/lib/settings"
import { addPayment, getPayments } from "@/lib/payments"
import { verifyTurnstile } from "@/lib/turnstile"
import { rateLimit } from "@/lib/rateLimit"
import { promises as fs } from "fs"
import path from "path"
import { validatePaymentScreenshotBuffer } from "@/lib/paymentScreenshotValidate"
import crypto from "crypto"
import type { Payment } from "@/lib/payments"

const BUCKET = "uploads"
const STORAGE_PATH = "qr-screenshots"
const DATA_PATH = path.join(process.cwd(), "src", "data", "payments.json")
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "qr-screenshots")

async function ensureFile() {
  try {
    await fs.access(path.dirname(DATA_PATH))
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, "[]", "utf-8")
  }
}

export async function POST(req: Request) {
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  await ensureFile()
  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 })

  const turnstileToken = String(formData.get("turnstileToken") ?? "").trim()
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "").split(",")[0] || null
  const turnstileResult = await verifyTurnstile(turnstileToken, ip)
  if (!turnstileResult.success) {
    return NextResponse.json({ ok: false, error: "Verification failed. Please try again." }, { status: 400 })
  }

  const nameRaw = String(formData.get("name") ?? "").trim()
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase()
  const name = nameRaw.length >= 2 ? nameRaw : "Manual payment"
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw : `payer+${Date.now()}@local.placeholder`
  const paymentCode = String(formData.get("paymentCode") ?? "").trim()
  const amount = Number(formData.get("amount") ?? 100)
  const paymentPlanRaw = String(formData.get("paymentPlan") ?? "entry").toLowerCase()
  if (paymentPlanRaw === "annual") {
    return NextResponse.json({ ok: false, error: "Annual payment plan is disabled." }, { status: 400 })
  }
  const paymentPlan = "entry" as const
  const screenshot = formData.get("screenshot") as File | null

  if (!paymentCode || !/^\d{4,6}$/.test(paymentCode)) {
    return NextResponse.json({ ok: false, error: "Valid 4-6 digit code required" }, { status: 400 })
  }
  if (!screenshot || screenshot.size === 0) {
    return NextResponse.json({ ok: false, error: "Payment screenshot required" }, { status: 400 })
  }

  const maxBytes = 5 * 1024 * 1024
  if (screenshot.size > maxBytes) {
    return NextResponse.json({ ok: false, error: "Screenshot must be under 5 MB" }, { status: 400 })
  }
  const mime = (screenshot.type || "").toLowerCase()
  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
  if (mime && !allowedMime.includes(mime)) {
    return NextResponse.json({ ok: false, error: "Only JPEG, PNG, or WebP screenshots are allowed" }, { status: 400 })
  }

  const buf = Buffer.from(await screenshot.arrayBuffer())
  const validated = validatePaymentScreenshotBuffer(buf)
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 })
  }

  const screenshotSha256 = crypto.createHash("sha256").update(buf).digest("hex")
  const settings = await getSettings()
  const entryFee = Math.max(1, Number(settings?.entryFee ?? 100))
  const expected = entryFee
  if (!Number.isFinite(amount) || amount !== expected) {
    return NextResponse.json({ ok: false, error: `Amount must be ₹${expected} (current entry fee). Refresh and try again.` }, { status: 400 })
  }

  const existing = await getPayments()
  const dupImage = existing.some((p) => {
    const st = String(p.status ?? "")
    if (st === "denied" || st === "rejected" || st === "failed") return false
    const m = (p.meta ?? {}) as Record<string, unknown>
    return String(m.screenshotSha256 ?? "") === screenshotSha256
  })
  if (dupImage) {
    return NextResponse.json(
      { ok: false, error: "This screenshot was already used in another request. Upload your latest payment receipt." },
      { status: 400 }
    )
  }

  let screenshotUrl = ""
  const supabase = createServerSupabase()

  if (supabase) {
    try {
      const ext = (screenshot.name.split(".").pop() || "png").toLowerCase()
      const filename = `manual-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext === "jpeg" ? "jpg" : ext}`
      const contentType = screenshot.type || "image/png"
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${STORAGE_PATH}/${filename}`, buf, { contentType, upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
        screenshotUrl = urlData?.publicUrl ?? ""
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed"
      return NextResponse.json({ ok: false, error: msg }, { status: 500 })
    }
  } else {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      const ext = screenshot.name.split(".").pop() || "png"
      const filename = `manual-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)
      await fs.writeFile(filepath, buf)
      screenshotUrl = `/uploads/qr-screenshots/${filename}`
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed"
      return NextResponse.json({ ok: false, error: msg }, { status: 500 })
    }
  }

  const id = String(Date.now())
  const payment: Payment = {
    id,
    amount,
    type: "tournament",
    status: "pending_approval",
    gateway: "qr",
    meta: {
      name,
      email,
      paymentKey: paymentCode,
      screenshotUrl,
      screenshotSha256,
      paymentPlan,
      manualProofOnly: true,
      submittedAt: Date.now()
    },
    created_at: Date.now()
  }

  const ok = await addPayment(payment)
  if (!ok) {
    try {
      const txt = await fs.readFile(DATA_PATH, "utf-8")
      const current = JSON.parse(txt || "[]")
      current.push({ ...payment, meta: { ...payment.meta, screenshotUrl } })
      await fs.writeFile(DATA_PATH, JSON.stringify(current, null, 2), "utf-8")
    } catch {
      return NextResponse.json({ ok: false, error: "Failed to save payment" }, { status: 500 })
    }
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL || (process.env.ADMIN_USERNAME?.includes("@") ? process.env.ADMIN_USERNAME : "")
    if (adminEmail) {
      const { sendEmail } = await import("@/lib/email")
      const { getEmailTemplate } = await import("@/lib/emailTheme")
      const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/more/admin-dashboard`
      const htmlTemplate = getEmailTemplate({
        title: "IQ Earners Admin",
        subtitle: "New manual payment (screenshot)",
        content: `A new <strong>manual UPI</strong> entry payment of <strong>₹${amount}</strong> was submitted by <strong>${name}</strong> (code: ${paymentCode}). <strong>No auto-verification</strong> — open the admin dashboard, review the screenshot, then approve or reject. Payment ID: <strong>${id}</strong>.`,
        highlightContent: `₹${amount}`,
        buttonLink: dashboardUrl,
        buttonText: "Open Admin Dashboard",
        footerText: `Payment ID: ${id} · Plan: ${paymentPlan}`
      })
      sendEmail({
        to: adminEmail,
        subject: `[ACTION] Manual payment ₹${amount} — ID ${id} (screenshot)`,
        html: htmlTemplate
      }).catch(() => {})
    }
  } catch {}

  return NextResponse.json({ ok: true, id })
}

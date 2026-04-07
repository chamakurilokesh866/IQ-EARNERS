import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"
import { getSettings } from "@/lib/settings"
import { addPayment } from "@/lib/payments"
import { verifyTurnstile } from "@/lib/turnstile"
import { rateLimit } from "@/lib/rateLimit"
import { promises as fs } from "fs"
import path from "path"

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

  const name = String(formData.get("name") ?? "").trim()
  const paymentCode = String(formData.get("paymentCode") ?? "").trim()
  const amount = Number(formData.get("amount") ?? 100)
  const screenshot = formData.get("screenshot") as File | null

  if (!name || name.length < 2) return NextResponse.json({ ok: false, error: "Name required (min 2 chars)" }, { status: 400 })
  if (!paymentCode || !/^\d{4,6}$/.test(paymentCode)) return NextResponse.json({ ok: false, error: "Valid 4-6 digit code required" }, { status: 400 })
  if (!screenshot || screenshot.size === 0) return NextResponse.json({ ok: false, error: "Payment screenshot required" }, { status: 400 })

  const settings = await getSettings()
  const entryFee = Math.max(1, Number(settings?.entryFee ?? 100))
  if (amount !== entryFee) return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 })

  let screenshotUrl = ""
  const supabase = createServerSupabase()

  if (supabase) {
    try {
      const ext = (screenshot.name.split(".").pop() || "png").toLowerCase()
      const filename = `qr-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext === "jpeg" ? "jpg" : ext}`
      const buf = Buffer.from(await screenshot.arrayBuffer())
      const contentType = screenshot.type || "image/png"
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${STORAGE_PATH}/${filename}`, buf, { contentType, upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
        screenshotUrl = urlData?.publicUrl ?? ""
      }
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || "Upload failed" }, { status: 500 })
    }
  } else {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      const ext = screenshot.name.split(".").pop() || "png"
      const filename = `qr-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)
      const buf = Buffer.from(await screenshot.arrayBuffer())
      await fs.writeFile(filepath, buf)
      screenshotUrl = `/uploads/qr-screenshots/${filename}`
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || "Upload failed" }, { status: 500 })
    }
  }

  const id = String(Date.now())
  const payment = {
    id,
    amount,
    type: "tournament",
    status: "pending_approval",
    gateway: "qr",
    meta: { name, paymentKey: paymentCode, screenshotUrl },
    created_at: Date.now()
  } as import("@/lib/payments").Payment

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

  // Notify admin via email about new payment request
  try {
    const adminEmail = process.env.ADMIN_EMAIL || (process.env.ADMIN_USERNAME?.includes("@") ? process.env.ADMIN_USERNAME : "")
    if (adminEmail) {
      const { sendEmail } = await import("@/lib/email")
      const { getEmailTemplate } = await import("@/lib/emailTheme")
      const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/more/admin-dashboard`
      const htmlTemplate = getEmailTemplate({
        title: "IQ Earners Admin",
        subtitle: "New Payment Approval Required",
        content: `A new manual QR payment of <strong>₹${amount}</strong> has been submitted by <strong>${name}</strong> (Code: ${paymentCode}). Screenshot is attached. Please review and approve/deny in the admin dashboard.`,
        highlightContent: `₹${amount}`,
        buttonLink: dashboardUrl,
        buttonText: "Open Admin Dashboard",
        footerText: `Payment ID: ${id} · Screenshot: ${screenshotUrl ? "Attached" : "Missing"}`
      })
      sendEmail({
        to: adminEmail,
        subject: `[ACTION] New Payment ₹${amount} from ${name} — Approval Required`,
        html: htmlTemplate
      }).catch(() => {})
    }
  } catch {}

  return NextResponse.json({ ok: true, id })
}

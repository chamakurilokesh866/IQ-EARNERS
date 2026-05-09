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
import { extractPaymentProofWithOcr, extractReceiptEpochCandidates, isEnteredUtrPresentInOcr, pickLikelyUtrFromOcr } from "@/lib/paymentScreenshotOcr"
import { verifyUtrWithCashfree } from "@/lib/cashfreeVerifyUtr"
import { verifyManualQrYesToken } from "@/lib/manualQrFlowToken"

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

function normalizeUtr(s: string): string {
  return s.trim().replace(/\s+/g, "").toUpperCase()
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
  const utrRaw = String(formData.get("utr") ?? "").trim()
  const enteredUtr = normalizeUtr(utrRaw)
  const screenshot = formData.get("screenshot") as File | null
  const manualYesToken = String(formData.get("manualYesToken") ?? "").trim()

  if (!paymentCode || !/^\d{4,6}$/.test(paymentCode)) return NextResponse.json({ ok: false, error: "Valid 4-6 digit code required" }, { status: 400 })
  if (enteredUtr && (enteredUtr.length < 10 || enteredUtr.length > 32)) {
    return NextResponse.json({ ok: false, error: "Enter a valid UTR / reference number (10–32 characters)" }, { status: 400 })
  }
  if (enteredUtr && !/^[0-9A-Z]+$/.test(enteredUtr)) {
    return NextResponse.json({ ok: false, error: "UTR should contain only digits and letters" }, { status: 400 })
  }
  if (!screenshot || screenshot.size === 0) return NextResponse.json({ ok: false, error: "Payment screenshot required" }, { status: 400 })
  if (!manualYesToken) {
    return NextResponse.json({ ok: false, error: "Manual scan confirmation missing. Please scan QR and click Yes, then upload proof." }, { status: 400 })
  }
  const yesPayload = verifyManualQrYesToken(manualYesToken)
  if (!yesPayload) {
    return NextResponse.json({ ok: false, error: "Manual scan session expired. Please restart scan and confirm payment again." }, { status: 400 })
  }
  const scanSpanMs = yesPayload.yesAt - yesPayload.startAt
  if (scanSpanMs < 5_000 || scanSpanMs > 5 * 60 * 1000) {
    return NextResponse.json({ ok: false, error: "Payment flow timing invalid. Please complete payment from scanner and click Yes within 5 minutes." }, { status: 400 })
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
  let ocrExtract: Awaited<ReturnType<typeof extractPaymentProofWithOcr>> | null = null
  try {
    ocrExtract = await extractPaymentProofWithOcr(buf)
  } catch {
    return NextResponse.json({ ok: false, error: "Could not verify screenshot text. Upload a clearer payment screenshot and retry." }, { status: 400 })
  }
  const detectedUtr = ocrExtract ? normalizeUtr(pickLikelyUtrFromOcr(ocrExtract) ?? "") : ""
  const finalUtr = enteredUtr || detectedUtr
  if (!finalUtr || finalUtr.length < 10 || finalUtr.length > 32) {
    return NextResponse.json({ ok: false, error: "Could not auto-detect a valid UTR from screenshot. Please enter UTR manually or upload a clearer receipt." }, { status: 400 })
  }
  const utrMatchedInOcr = enteredUtr ? (ocrExtract ? isEnteredUtrPresentInOcr(enteredUtr, ocrExtract) : false) : true
  if (enteredUtr && !utrMatchedInOcr) {
    return NextResponse.json({ ok: false, error: "UTR not found in uploaded screenshot. Please upload the real payment receipt screenshot." }, { status: 400 })
  }
  const receiptTimes = extractReceiptEpochCandidates(ocrExtract?.rawText ?? "")
  if (!receiptTimes.length) {
    return NextResponse.json({ ok: false, error: "Receipt time/date not visible in screenshot. Upload full UPI receipt with timestamp." }, { status: 400 })
  }
  const inFlowRange = receiptTimes.filter((ts) => ts >= yesPayload.startAt && ts <= yesPayload.yesAt)
  if (!inFlowRange.length) {
    return NextResponse.json({ ok: false, error: "Receipt timestamp must be between QR scan start and your Yes confirmation." }, { status: 400 })
  }
  const flowMidMin = yesPayload.startAt + Math.floor(scanSpanMs * 0.15)
  const flowMidMax = yesPayload.yesAt - Math.floor(scanSpanMs * 0.15)
  const hasMiddleTimestamp = scanSpanMs < 90_000 || inFlowRange.some((ts) => ts >= flowMidMin && ts <= flowMidMax)
  if (!hasMiddleTimestamp) {
    return NextResponse.json({ ok: false, error: "Receipt timestamp should be in the middle of scan and confirmation window." }, { status: 400 })
  }
  const screenshotSha256 = crypto.createHash("sha256").update(buf).digest("hex")

  const settings = await getSettings()
  const entryFee = Math.max(1, Number(settings?.entryFee ?? 100))
  const expected = entryFee
  if (!Number.isFinite(amount) || amount !== expected) {
    return NextResponse.json({ ok: false, error: `Amount must be ₹${expected} (current entry fee). Refresh and try again.` }, { status: 400 })
  }

  const existing = await getPayments()
  const dupUtr = existing.some((p) => {
    if (p.gateway !== "qr") return false
    const m = (p.meta ?? {}) as Record<string, unknown>
    const u = normalizeUtr(String(m.utr ?? ""))
    if (!u || u !== finalUtr) return false
    return true
  })
  if (dupUtr) {
    return NextResponse.json({ ok: false, error: "This UTR was already submitted. Use the reference from your new payment." }, { status: 400 })
  }
  const dupImage = existing.some((p) => {
    const st = String(p.status ?? "")
    if (st === "denied" || st === "rejected" || st === "failed") return false
    const m = (p.meta ?? {}) as Record<string, unknown>
    return String(m.screenshotSha256 ?? "") === screenshotSha256
  })
  if (dupImage) {
    return NextResponse.json({ ok: false, error: "This screenshot was already used in another request. Upload your actual latest payment screenshot." }, { status: 400 })
  }

  let screenshotUrl = ""
  const supabase = createServerSupabase()

  if (supabase) {
    try {
      const ext = (screenshot.name.split(".").pop() || "png").toLowerCase()
      const filename = `qr-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext === "jpeg" ? "jpg" : ext}`
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
      const filename = `qr-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)
      await fs.writeFile(filepath, buf)
      screenshotUrl = `/uploads/qr-screenshots/${filename}`
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed"
      return NextResponse.json({ ok: false, error: msg }, { status: 500 })
    }
  }

  const id = String(Date.now())
  let bankMatched: boolean | null = null
  let bankVerifyError: string | undefined
  let bankTxTime: string | undefined
  const bankResult = await verifyUtrWithCashfree(finalUtr, expected)
  if (bankResult && bankResult.matched === true) {
    bankMatched = true
    bankTxTime = bankResult.txTime
  } else if (bankResult && bankResult.matched === false) {
    bankMatched = false
    bankVerifyError = bankResult.error
  }

  const payment = {
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
      utr: finalUtr,
      utrAutoDetected: !enteredUtr,
      utrSubmittedAt: Date.now(),
      ocrUtrMatched: enteredUtr ? true : Boolean(detectedUtr),
      ocrUtrCandidates: ocrExtract?.utrCandidates ?? [],
      ocrReceiptTimes: inFlowRange.slice(0, 5),
      manualScanStartedAt: yesPayload.startAt,
      manualYesAt: yesPayload.yesAt,
      bankMatched,
      ...(bankVerifyError ? { bankVerifyError } : {}),
      ...(bankTxTime ? { bankTxTime } : {})
    },
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

  try {
    const adminEmail = process.env.ADMIN_EMAIL || (process.env.ADMIN_USERNAME?.includes("@") ? process.env.ADMIN_USERNAME : "")
    if (adminEmail) {
      const { sendEmail } = await import("@/lib/email")
      const { getEmailTemplate } = await import("@/lib/emailTheme")
      const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/more/admin-dashboard`
      const htmlTemplate = getEmailTemplate({
        title: "IQ Earners Admin",
        subtitle: "New Payment Approval Required",
        content: `A new manual QR payment (<strong>Entry</strong>) of <strong>₹${amount}</strong> has been submitted by <strong>${name}</strong> (Code: ${paymentCode}, UTR: ${finalUtr}). Please review the screenshot and approve in the admin dashboard.`,
        highlightContent: `₹${amount}`,
        buttonLink: dashboardUrl,
        buttonText: "Open Admin Dashboard",
        footerText: `Payment ID: ${id} · Plan: ${paymentPlan} · UTR: ${finalUtr}`
      })
      sendEmail({
        to: adminEmail,
        subject: `[ACTION] New Entry Payment ₹${amount} — UTR ${finalUtr}`,
        html: htmlTemplate
      }).catch(() => {})
    }
  } catch {}

  return NextResponse.json({ ok: true, id, utr: finalUtr, utrAutoDetected: !enteredUtr })
}

import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"
import { addPayment, updatePayment, isUtrOrTransIdUsed } from "@/lib/payments"
import { getSettings } from "@/lib/settings"
import { isIpBlocked, unblockIp } from "@/lib/inspectSecurity"
import { getClientIp } from "@/lib/inspectSecurity"
import { verifyUtrWithCashfree, verifyOrderWithCashfree } from "@/lib/cashfreeVerifyUtr"
import { promises as fs } from "fs"
import path from "path"

const BUCKET = "uploads"
const STORAGE_PATH = "qr-screenshots"
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "qr-screenshots")
import { rateLimit } from "@/lib/rateLimit"

export async function POST(req: Request) {
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts", retryAfter: rl.retryAfter }, { status: 429 })

  const ip = getClientIp(req)
  const blocked = await isIpBlocked(ip)
  if (!blocked) return NextResponse.json({ ok: false, error: "IP not blocked" }, { status: 400 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 })

  const extractedJson = String(formData.get("extractedText") ?? "{}").trim()
  const screenshot = formData.get("screenshot") as File | null

  let extractedText: { transId?: string; utr?: string; orderId?: string; amount?: number; appeal?: string } = {}
  try {
    extractedText = extractedJson ? JSON.parse(extractedJson) : {}
  } catch { }

  const utr = (extractedText?.utr ?? "").trim().replace(/\s/g, "")
  const transId = (extractedText?.transId ?? "").trim().replace(/\s/g, "")
  const orderId = (extractedText?.orderId ?? "").trim().replace(/\s/g, "")
  const hasProof = (transId && transId.length >= 6) || (utr && utr.length >= 6) || (orderId && orderId.length >= 4) || (extractedText?.amount != null && extractedText.amount > 0)

  if (!hasProof) {
    return NextResponse.json({
      ok: false,
      error: "Enter UTR or Transaction ID (min 6 characters), or upload a screenshot with payment details."
    }, { status: 400 })
  }

  const alreadyUsed = await isUtrOrTransIdUsed(utr, transId, orderId)
  if (alreadyUsed) {
    return NextResponse.json({ ok: false, error: "This UTR or Transaction ID has already been used." }, { status: 400 })
  }

  const settings = await getSettings()
  const amount = Math.max(1, Number(settings?.blockedAmount ?? 50))

  let screenshotUrl = ""
  const supabase = createServerSupabase()
  if (screenshot && screenshot.size > 0 && supabase) {
    try {
      const ext = (screenshot.name.split(".").pop() || "png").toLowerCase()
      const filename = `inspect-unblock-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext === "jpeg" ? "jpg" : ext}`
      const buf = Buffer.from(await screenshot.arrayBuffer())
      const contentType = screenshot.type || "image/png"
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${STORAGE_PATH}/${filename}`, buf, { contentType, upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${STORAGE_PATH}/${filename}`)
        screenshotUrl = urlData?.publicUrl ?? ""
      }
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error)?.message || "Upload failed" }, { status: 500 })
    }
  } else if (screenshot && screenshot.size > 0) {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true })
      const ext = screenshot.name.split(".").pop() || "png"
      const filename = `inspect-unblock-${Date.now()}.${ext}`
      const filepath = path.join(UPLOAD_DIR, filename)
      const buf = Buffer.from(await screenshot.arrayBuffer())
      await fs.writeFile(filepath, buf)
      screenshotUrl = `/uploads/qr-screenshots/${filename}`
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error)?.message || "Upload failed" }, { status: 500 })
    }
  }

  const id = String(Date.now())
  const meta: Record<string, unknown> = { unblockIp: ip, screenshotUrl, extractedText, appeal: extractedText?.appeal }

  const expectedAmount = (extractedText?.amount ?? amount) || amount
  let bankMatched: boolean | null = null

  const verifyPromises: Promise<Awaited<ReturnType<typeof verifyUtrWithCashfree>>>[] = []
  if (orderId && orderId.length >= 4) verifyPromises.push(verifyOrderWithCashfree(orderId, expectedAmount))
  const verifyIds = [...new Set([utr, transId].filter((r) => r && r.length >= 8))]
  verifyIds.forEach((ref) => verifyPromises.push(verifyUtrWithCashfree(ref, expectedAmount)))

  if (verifyPromises.length > 0) {
    const results = await Promise.all(verifyPromises)
    const firstMatch = results.find((r) => r?.matched === true)
    if (firstMatch?.matched) bankMatched = true
  }
  meta.bankMatched = bankMatched

  const payment = {
    id,
    amount,
    type: "inspect_unblock",
    status: "pending_approval",
    gateway: "qr",
    meta,
    created_at: Date.now()
  }

  // Notify admin of new unblock request/appeal
  try {
    const appeal = (extractedText as any).appeal || ""
    const { sendPushNotification } = await import("@/lib/push")
    await sendPushNotification({
      title: "🛡️ New Unblock Appeal",
      body: `IP ${ip} submitted an unblock request with appeal: "${appeal.slice(0, 50)}..."`
    })
  } catch { }

  const ok = await addPayment(payment)
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })

  if (bankMatched === true) {
    const now = Date.now()
    await updatePayment(id, { status: "success", confirmed_at: now, meta: { ...meta, approved_at: now, autoApproved: true } })
    await unblockIp(ip)
    return NextResponse.json({ ok: true, id, autoApproved: true })
  }
  return NextResponse.json({ ok: true, id })
}

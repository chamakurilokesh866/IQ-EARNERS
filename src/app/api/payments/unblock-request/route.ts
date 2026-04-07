import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"
import { addPayment, updatePayment, isUtrOrTransIdUsed } from "@/lib/payments"
import { getSettings } from "@/lib/settings"
import { unblockUser } from "@/lib/blocked"
import { recordUnblocked } from "@/lib/unblocked"
import { verifyUtrWithCashfree, verifyOrderWithCashfree } from "@/lib/cashfreeVerifyUtr"
import { promises as fs } from "fs"
import path from "path"

const BUCKET = "uploads"
const STORAGE_PATH = "qr-screenshots"
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "qr-screenshots")
const DATA_DIR = path.join(process.cwd(), "src", "data")
import { rateLimit } from "@/lib/rateLimit"

export async function POST(req: Request) {
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts", retryAfter: rl.retryAfter }, { status: 429 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 })

  const username = String(formData.get("username") ?? "").trim()
  const extractedJson = String(formData.get("extractedText") ?? "{}").trim()
  const screenshot = formData.get("screenshot") as File | null

  if (!username || username.length < 2) return NextResponse.json({ ok: false, error: "Username required" }, { status: 400 })

  let extractedText: { transId?: string; utr?: string; orderId?: string; amount?: number; date?: string; time?: string } = {}
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
    return NextResponse.json({
      ok: false,
      error: "This UTR or Transaction ID has already been used for another unblock. Each payment can only be used once."
    }, { status: 400 })
  }

  const settings = await getSettings()
  const unblockAmount = Math.max(1, Number(settings?.blockedAmount ?? 50))

  let screenshotUrl = ""
  const supabase = createServerSupabase()

  if (screenshot && screenshot.size > 0) {
    if (supabase) {
      try {
        const ext = (screenshot.name.split(".").pop() || "png").toLowerCase()
        const filename = `unblock-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext === "jpeg" ? "jpg" : ext}`
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
    } else {
      try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true })
        const ext = screenshot.name.split(".").pop() || "png"
        const filename = `unblock-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const filepath = path.join(UPLOAD_DIR, filename)
        const buf = Buffer.from(await screenshot.arrayBuffer())
        await fs.writeFile(filepath, buf)
        screenshotUrl = `/uploads/qr-screenshots/${filename}`
      } catch (e) {
        return NextResponse.json({ ok: false, error: (e as Error)?.message || "Upload failed" }, { status: 500 })
      }
    }
  }

  const id = String(Date.now())
  const meta: Record<string, unknown> = { unblockFor: username, name: username, screenshotUrl, extractedText }

  // Server-side Cashfree verification: Order ID (Payment Links) or UTR/Transaction ID (Auto Collect)
  const expectedAmount = (extractedText?.amount ?? unblockAmount) || unblockAmount
  let bankMatched: boolean | null = null
  let bankVerifyError: string | undefined
  let txTime: string | undefined

  const verifyPromises: Promise<Awaited<ReturnType<typeof verifyUtrWithCashfree>>>[] = []
  if (orderId && orderId.length >= 4) verifyPromises.push(verifyOrderWithCashfree(orderId, expectedAmount))
  const verifyIds = [...new Set([utr, transId].filter((r) => r && r.length >= 8))]
  verifyIds.forEach((ref) => verifyPromises.push(verifyUtrWithCashfree(ref, expectedAmount)))

  if (verifyPromises.length > 0) {
    const results = await Promise.all(verifyPromises)
    const firstMatch = results.find((r) => r?.matched === true)
    if (firstMatch?.matched) {
      bankMatched = true
      if (firstMatch.txTime) txTime = firstMatch.txTime
    } else {
      const firstResult = results.find((r) => r !== null)
      if (firstResult && !firstResult.matched) {
        bankMatched = false
        bankVerifyError = firstResult.error
      }
    }
  }
  meta.bankMatched = bankMatched
  if (bankVerifyError) meta.bankVerifyError = bankVerifyError
  if (txTime) meta.bankTxTime = txTime

  const payment = {
    id,
    amount: unblockAmount,
    type: "unblock",
    status: "pending_approval",
    gateway: "qr",
    meta,
    created_at: Date.now()
  }

  const ok = await addPayment(payment)
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })

  // Auto-approve if UTR matched with Cashfree and admin hasn't responded
  if (bankMatched === true) {
    const unblockFor = username.trim()
    const now = Date.now()
    await updatePayment(id, {
      status: "success",
      confirmed_at: now,
      meta: { ...meta, approved_at: now, autoApproved: true }
    })
    if (unblockFor) {
      const statsUpdate = (async () => {
        try {
          const statsPath = path.join(DATA_DIR, "user-stats.json")
          const txt = await fs.readFile(statsPath, "utf-8").catch(() => "{}")
          const all: Record<string, unknown> = JSON.parse(txt || "{}")
          const key = unblockFor.toLowerCase()
          const entry = all[key] as Record<string, unknown> | undefined
          if (entry) {
            const copy = { ...entry }
            delete copy.blocked
            delete copy.blockReason
            all[key] = copy
            await fs.writeFile(statsPath, JSON.stringify(all, null, 2), "utf-8")
          }
        } catch { }
      })()
      await Promise.all([unblockUser(unblockFor), recordUnblocked(unblockFor, now), statsUpdate])
    }
    return NextResponse.json({ ok: true, id, autoApproved: true })
  }

  return NextResponse.json({ ok: true, id })
}

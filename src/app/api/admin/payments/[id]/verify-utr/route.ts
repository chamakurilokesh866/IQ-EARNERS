import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPayments, updatePayment } from "@/lib/payments"
import { verifyUtrWithCashfree, verifyOrderWithCashfree } from "@/lib/cashfreeVerifyUtr"

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ ok: false, error: "Not found" }, { status: 400 })

  const arr = await getPayments()
  const rec = arr.find((p: { id: string }) => p.id === id)
  if (!rec) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const meta = (rec.meta || {}) as Record<string, unknown>
  const extractedText = (meta?.extractedText ?? meta) as Record<string, unknown> | undefined
  const utr = String(extractedText?.utr ?? meta?.utr ?? "").trim().replace(/\s/g, "")
  const transId = String(extractedText?.transId ?? meta?.transId ?? "").trim().replace(/\s/g, "")
  const orderId = String(extractedText?.orderId ?? meta?.orderId ?? "").trim().replace(/\s/g, "")
  const verifyIds = [...new Set([utr, transId].filter((r) => r && r.length >= 8))]
  if (verifyIds.length === 0 && (!orderId || orderId.length < 4)) {
    return NextResponse.json({ ok: false, error: "No UTR, Transaction ID or Order ID to verify" }, { status: 400 })
  }

  const expectedAmount = Number(extractedText?.amount ?? rec.amount ?? 0) || Number(rec.amount ?? 0)
  const verifyPromises = verifyIds.map((ref) => verifyUtrWithCashfree(ref, expectedAmount))
  if (orderId && orderId.length >= 4) verifyPromises.push(verifyOrderWithCashfree(orderId, expectedAmount))
  const results = await Promise.all(verifyPromises)
  const firstMatch = results.find((r) => r?.matched === true)
  let bankMatched: boolean | null = null
  let bankVerifyError: string | undefined
  let txTime: string | undefined

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

  const newMeta: Record<string, unknown> = { ...meta, bankMatched }
  if (bankVerifyError) newMeta.bankVerifyError = bankVerifyError
  else delete newMeta.bankVerifyError
  if (txTime) newMeta.bankTxTime = txTime
  else delete newMeta.bankTxTime

  await updatePayment(id, { meta: newMeta })
  return NextResponse.json({ ok: true, bankMatched, bankVerifyError, bankTxTime: txTime })
}

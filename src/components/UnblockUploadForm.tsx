"use client"

import { useState, useCallback } from "react"

type Extracted = { transId?: string; utr?: string; orderId?: string; amount?: number; date?: string; time?: string; rawText?: string }

function parseExtractedDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const s = dateStr.replace(/\s+/g, " ").trim()
  // YYYY-MM-DD, YYYY/MM/DD
  const iso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10))
    return isNaN(d.getTime()) ? null : d
  }
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const d1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (d1) {
    const dd = parseInt(d1[1], 10)
    const mm = parseInt(d1[2], 10) - 1
    const yy = parseInt(d1[3], 10)
    const year = yy < 100 ? 2000 + yy : yy
    const d = new Date(year, mm, dd)
    return isNaN(d.getTime()) ? null : d
  }
  // DD MMM YYYY, DD Mon YYYY
  const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const d2 = s.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{2,4})$/i)
  if (d2) {
    const dd = parseInt(d2[1], 10)
    const mm = months[d2[2].toLowerCase()]
    if (mm == null) return null
    const yy = parseInt(d2[3], 10)
    const year = yy < 100 ? 2000 + yy : yy
    const d = new Date(year, mm, dd)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function isToday(date: Date): boolean {
  const t = new Date()
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear()
}

function extractFromText(text: string): Extracted {
  const t = text.replace(/\s+/g, " ")
  const result: Extracted = { rawText: t.slice(0, 500) }
  const utrMatch = t.match(/UTR[:\s#]*([A-Za-z0-9]{8,20})/i) || t.match(/(?:utr|unique\s*transaction\s*ref)[:\s#]*([A-Za-z0-9]{8,20})/i) || t.match(/(?:ref\s*no|reference\s*no)[:\s#]*([A-Za-z0-9]{8,20})/i)
  if (utrMatch) result.utr = utrMatch[1]
  // Transaction ID: various UPI/bank receipt formats
  const orderMatch = t.match(/(?:order\s*id|order\s*ref)[:\s#]*([A-Za-z0-9_-]{8,64})/i) || t.match(/order[_\s]*([A-Za-z0-9_-]{12,64})/i)
  if (orderMatch) result.orderId = orderMatch[1]
  const transPatterns = [
    /(?:txn|transaction|trans)\s*(?:id|ref|reference)?[:\s#]*([A-Za-z0-9]{6,24})/i,
    /(?:transaction\s*id|txn\s*id|trans\s*id|ref\s*no|reference\s*no)[:\s#]*([A-Za-z0-9]{6,24})/i,
    /(?:upi\s*ref|upi\s*reference|payment\s*ref)[:\s#]*([A-Za-z0-9]{6,24})/i,
    /(?:payment\s*id|transaction\s*reference)[:\s#]*([A-Za-z0-9]{6,24})/i,
    /(?:transaction\s*ref|txn\s*ref)[:\s#]*([A-Za-z0-9]{6,24})/i,
    /(?:ref\s*no|reference\s*no)[:\s#]*([A-Za-z0-9]{6,24})/i,
    /ID[:\s#]*([A-Za-z0-9]{10,20})(?=\s|$)/,
    // Fallback: 12–16 digit ref (avoid matching dates/amounts)
    /(?:^|\s)([0-9]{12,16})(?=\s|$)/,
  ]
  for (const re of transPatterns) {
    const m = t.match(re)
    if (m && m[1] && m[1] !== result.utr) {
      result.transId = result.transId || m[1]
      break
    }
  }
  const amtMatch = t.match(/₹\s*(\d+)|Rs\.?\s*(\d+)|(\d+)\s*rupees?|amount[:\s]*(\d+)/i)
  if (amtMatch) result.amount = parseInt(amtMatch[1] || amtMatch[2] || amtMatch[3] || amtMatch[4] || "0", 10)
  // Date: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY
  const dateMatch = t.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i)
  if (dateMatch) result.date = (dateMatch[1] || dateMatch[2] || dateMatch[3] || "").trim()
  // Time: HH:MM, HH:MM AM/PM, HH:MM:SS
  const timeMatch = t.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:am|pm))?)/i)
  if (timeMatch) result.time = timeMatch[1].trim()
  return result
}

export default function UnblockUploadForm({
  username,
  amount,
  qrUrl,
  onSuccess,
  onError,
  lightBg
}: {
  username: string
  amount: number
  qrUrl?: string
  onSuccess: (paymentId: string) => void
  onError: (msg: string) => void
  lightBg?: boolean
}) {
  const isLight = !!lightBg
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [stage, setStage] = useState<"idle" | "scanning" | "submit" | "submitting">("idle")
  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const [loading, setLoading] = useState(false)
  const [manualUtr, setManualUtr] = useState("")
  const [manualTransId, setManualTransId] = useState("")
  const [manualOrderId, setManualOrderId] = useState("")

  const runOcr = useCallback(async (f: File) => {
    setStage("scanning")
    setExtracted(null)
    try {
      const Tesseract = (await import("tesseract.js")).default
      const { data } = await Tesseract.recognize(f, "eng")
      const ex = extractFromText(data.text || "")
      setExtracted(ex)
      const hasProof = (ex.transId && ex.transId.length >= 4) || (ex.utr && ex.utr.length >= 4) || (ex.amount != null && ex.amount > 0)
      const parsedDate = ex.date ? parseExtractedDate(ex.date) : null
      const dateValid = !ex.date || (parsedDate != null && isToday(parsedDate))
      setStage(hasProof && dateValid ? "submit" : "idle")
      return hasProof
    } catch {
      setStage("idle")
      return false
    }
  }, [])

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || !f.type.startsWith("image/")) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStage("idle")
    await runOcr(f)
    e.target.value = ""
  }

  const effectiveUtr = (manualUtr || extracted?.utr || "").trim()
  const effectiveTransId = (manualTransId || extracted?.transId || "").trim()
  const effectiveOrderId = (manualOrderId || extracted?.orderId || "").trim()
  const canSubmitManual = (effectiveUtr.length >= 6 || effectiveTransId.length >= 6 || effectiveOrderId.length >= 4) && (effectiveUtr || effectiveTransId || effectiveOrderId)
  const canSubmitOcr = file && extracted && ((extracted.transId && extracted.transId.length >= 4) || (extracted.utr && extracted.utr.length >= 4) || (extracted.amount != null && extracted.amount > 0))
  const parsedDate = extracted?.date ? parseExtractedDate(extracted.date) : null
  const dateValid = !extracted?.date || (parsedDate != null && isToday(parsedDate))
  const canSubmit = (canSubmitManual || canSubmitOcr) && dateValid

  const submit = async () => {
    const payload: Extracted = {
      utr: effectiveUtr || undefined,
      transId: effectiveTransId || undefined,
      orderId: effectiveOrderId || undefined,
      amount: extracted?.amount,
      date: extracted?.date,
      time: extracted?.time
    }
    if (!canSubmit) return
    setLoading(true)
    onError("")
    try {
      const fd = new FormData()
      fd.append("username", username)
      fd.append("extractedText", JSON.stringify(payload))
      if (file && file.size > 0) fd.append("screenshot", file)
      const res = await fetch("/api/payments/unblock-request", { method: "POST", body: fd, credentials: "include" })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        onError(j?.error ?? "Submission failed")
        return
      }
      setStage("submitting")
      onSuccess(j.id ?? "")
    } catch {
      onError("Submission failed")
    } finally {
      setLoading(false)
    }
  }

  const boxCls = isLight ? "bg-white/80 border-amber-200/80 text-navy-700" : "bg-white/5 border-white/15 text-white/90"
  const labelCls = isLight ? "text-navy-600" : "text-white/70"
  const fileCls = isLight ? "file:bg-amber-100 file:text-navy-800" : "file:bg-white/10 file:text-white"
  const keyCls = isLight ? "text-navy-500" : "text-navy-500"

  return (
    <div className="space-y-4">
      {qrUrl && (
        <div className="text-center">
          <p className={`text-sm mb-2 ${isLight ? "text-navy-500" : "text-white/60"}`}>Scan QR and pay ₹{amount}</p>
          <img src={qrUrl} alt="Pay QR" className={`mx-auto w-40 h-40 object-contain rounded-lg border ${isLight ? "border-amber-200" : "border-white/15"}`} />
        </div>
      )}
      <div className="space-y-3">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${labelCls}`}>Payment references</p>
        <p className={`text-xs ${isLight ? "text-navy-500" : "text-white/55"}`}>Enter from UPI receipt or Cashfree dashboard.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="UTR / Transaction ID"
            value={manualUtr}
            onChange={(e) => setManualUtr(e.target.value.replace(/\s/g, ""))}
            className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-all focus:ring-2 ${isLight ? "border-amber-200/90 bg-white text-navy-900 placeholder:text-navy-400 focus:border-amber-400 focus:ring-amber-400/20" : "border-white/15 bg-white/[0.06] text-white placeholder:text-white/45 focus:border-primary/50 focus:ring-primary/15"}`}
            title="From UPI receipt: Transaction ID = UTR"
          />
          <input
            type="text"
            placeholder="Transaction ID (alternate)"
            value={manualTransId}
            onChange={(e) => setManualTransId(e.target.value.replace(/\s/g, ""))}
            className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-all focus:ring-2 ${isLight ? "border-amber-200/90 bg-white text-navy-900 placeholder:text-navy-400 focus:border-amber-400 focus:ring-amber-400/20" : "border-white/15 bg-white/[0.06] text-white placeholder:text-white/45 focus:border-primary/50 focus:ring-primary/15"}`}
          />
          <input
            type="text"
            placeholder="Order ID (Cashfree dashboard)"
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value.replace(/\s/g, ""))}
            className={`sm:col-span-2 w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-all focus:ring-2 ${isLight ? "border-amber-200/90 bg-white text-navy-900 placeholder:text-navy-400 focus:border-amber-400 focus:ring-amber-400/20" : "border-white/15 bg-white/[0.06] text-white placeholder:text-white/45 focus:border-primary/50 focus:ring-primary/15"}`}
            title="From Cashfree dashboard: Order ID column"
          />
        </div>
      </div>
      <div>
        <label className={`block text-[10px] font-bold uppercase tracking-wider ${labelCls} mb-2`}>Upload screenshot (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className={`block w-full text-sm rounded-xl border px-2 py-2 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:font-semibold cursor-pointer transition-colors ${isLight ? "border-amber-200/80 bg-white/90 file:bg-amber-100 file:text-navy-900" : "border-white/15 bg-white/[0.04] file:bg-white/12 file:text-white"}`}
        />
      </div>
      {stage === "scanning" && (
        <div className={`relative rounded-xl overflow-hidden border h-48 ${isLight ? "bg-white/60" : "bg-white/5"} ${isLight ? "border-amber-200" : "border-white/15"}`}>
          {preview && <img src={preview} alt="" className="w-full h-full object-contain opacity-50" />}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-0 right-0 h-1 bg-success rounded-full shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-unblock-scan" />
          </div>
          <div className={`absolute bottom-0 left-0 right-0 p-3 rounded-b-xl ${isLight ? "bg-navy-900/70" : "bg-black/60"}`}>
            <p className="text-sm font-medium text-success">Scanning screenshot…</p>
            <p className={`text-xs ${isLight ? "text-navy-300" : "text-white/60"}`}>Extracting UTR, transaction ID, amount, date & time</p>
          </div>
        </div>
      )}
      {(stage === "submit" || canSubmit) && (
        <div className="space-y-3">
          {(extracted || effectiveUtr || effectiveTransId) && (
            <div className={`flex gap-4 p-4 rounded-xl border ${boxCls}`}>
              {preview && <img src={preview} alt="Screenshot" className={`w-24 h-24 object-cover rounded-lg border shrink-0 ${isLight ? "border-amber-200" : "border-white/15"}`} />}
              <div className="flex-1 text-sm space-y-1">
                {(effectiveUtr || extracted?.utr) && <p><span className={keyCls}>UTR:</span> <span className="text-emerald-600 font-medium">{effectiveUtr || extracted?.utr}</span></p>}
                {(effectiveTransId || extracted?.transId) && <p><span className={keyCls}>Transaction ID:</span> <span className="text-emerald-600 font-medium">{effectiveTransId || extracted?.transId}</span></p>}
                {(effectiveOrderId || extracted?.orderId) && <p><span className={keyCls}>Order ID:</span> <span className="text-emerald-600 font-medium">{effectiveOrderId || extracted?.orderId}</span></p>}
                {extracted?.amount != null && extracted.amount > 0 && <p><span className={keyCls}>Amount:</span> ₹{extracted.amount}</p>}
                {extracted?.date && <p><span className={keyCls}>Date:</span> {extracted.date}</p>}
                {extracted?.time && <p><span className={keyCls}>Time:</span> {extracted.time}</p>}
              </div>
            </div>
          )}
          <button type="button" onClick={submit} disabled={loading} className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-45 ${isLight ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20" : "bg-primary text-black shadow-lg shadow-primary/20 hover:brightness-110"}`}>
            {loading ? "Submitting…" : "Submit for approval"}
          </button>
        </div>
      )}
      {stage === "idle" && file && extracted && (
        <>
          {!(extracted.transId || extracted.utr || (extracted.amount != null && extracted.amount > 0)) && (
            <p className={`text-sm ${isLight ? "text-amber-600" : "text-amber-400"}`}>Could not find UTR, transaction ID or amount. Please upload a clear payment confirmation screenshot.</p>
          )}
          {extracted.date && (() => {
            const pd = parseExtractedDate(extracted.date!)
            return pd && !isToday(pd) ? (
              <p className={`text-sm mt-2 ${isLight ? "text-amber-600" : "text-amber-400"}`}>Screenshot date ({extracted.date}) is not today. Please upload a payment made today.</p>
            ) : null
          })()}
        </>
      )}
    </div>
  )
}

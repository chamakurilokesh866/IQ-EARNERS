"use client"

import { useState, useCallback } from "react"

type Extracted = { transId?: string; utr?: string; orderId?: string; amount?: number; date?: string; time?: string }

function parseExtractedDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const s = dateStr.replace(/\s+/g, " ").trim()
  const iso = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10))
    return isNaN(d.getTime()) ? null : d
  }
  const d1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (d1) {
    const yy = parseInt(d1[3], 10)
    const year = yy < 100 ? 2000 + yy : yy
    const d = new Date(year, parseInt(d1[2], 10) - 1, parseInt(d1[1], 10))
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
  const result: Extracted = {}
  const utrMatch = t.match(/UTR[:\s#]*([A-Za-z0-9]{8,20})/i) || t.match(/(?:utr|unique\s*transaction\s*ref)[:\s#]*([A-Za-z0-9]{8,20})/i)
  if (utrMatch) result.utr = utrMatch[1]
  const orderMatch = t.match(/(?:order\s*id)[:\s#]*([A-Za-z0-9_-]{8,64})/i)
  if (orderMatch) result.orderId = orderMatch[1]
  const transMatch = t.match(/(?:txn|transaction)[:\s#]*([A-Za-z0-9]{6,24})/i)
  if (transMatch) result.transId = transMatch[1]
  const amtMatch = t.match(/₹\s*(\d+)|Rs\.?\s*(\d+)|amount[:\s]*(\d+)/i)
  if (amtMatch) result.amount = parseInt(amtMatch[1] || amtMatch[2] || amtMatch[3] || "0", 10)
  const dateMatch = t.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/)
  if (dateMatch) result.date = (dateMatch[1] || dateMatch[2] || "").trim()
  const timeMatch = t.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:am|pm))?)/i)
  if (timeMatch) result.time = timeMatch[1].trim()
  return result
}

export default function InspectUnblockForm({ amount, qrUrl, appeal, onSuccess, onError }: { amount: number; qrUrl?: string; appeal?: string; onSuccess: (id: string) => void; onError: (msg: string) => void }) {
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
    } catch {
      setStage("idle")
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
  const canSubmitManual = (effectiveUtr.length >= 6 || effectiveTransId.length >= 6 || effectiveOrderId.length >= 4)
  const canSubmitOcr = file && extracted && ((extracted.transId && extracted.transId.length >= 4) || (extracted.utr && extracted.utr.length >= 4) || (extracted.amount != null && extracted.amount > 0))
  const parsedDate = extracted?.date ? parseExtractedDate(extracted.date) : null
  const dateValid = !extracted?.date || (parsedDate != null && isToday(parsedDate))
  const canSubmit = (canSubmitManual || canSubmitOcr) && dateValid

  const submit = async () => {
    if (!canSubmit) return
    setLoading(true)
    onError("")
    try {
      const fd = new FormData()
      fd.append("extractedText", JSON.stringify({
        utr: effectiveUtr || undefined,
        transId: effectiveTransId || undefined,
        orderId: effectiveOrderId || undefined,
        amount: extracted?.amount,
        date: extracted?.date,
        time: extracted?.time,
        appeal: (appeal || "").trim()
      }))
      if (file && file.size > 0) fd.append("screenshot", file)
      const res = await fetch("/api/payments/inspect-unblock-request", { method: "POST", body: fd, credentials: "include" })
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

  const boxCls = "bg-black/50 border-emerald-500/30 text-emerald-300"

  return (
    <div className="space-y-4">
      {qrUrl && (
        <div className="text-center">
          <p className="text-sm mb-2 text-emerald-400/80">Scan QR and pay ₹{amount}</p>
          <img src={qrUrl} alt="Pay QR" className="mx-auto w-40 h-40 object-contain rounded-lg border border-emerald-500/30" />
        </div>
      )}
      <div className="space-y-2">
        <p className="text-xs text-emerald-400/80">Enter from receipt or dashboard</p>
        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="UTR / Transaction ID" value={manualUtr} onChange={(e) => setManualUtr(e.target.value.replace(/\s/g, ""))} className="w-full rounded-lg border border-emerald-500/30 bg-black/50 px-3 py-2 text-sm text-emerald-300 placeholder:text-emerald-500/50" />
          <input type="text" placeholder="Transaction ID (alt)" value={manualTransId} onChange={(e) => setManualTransId(e.target.value.replace(/\s/g, ""))} className="w-full rounded-lg border border-emerald-500/30 bg-black/50 px-3 py-2 text-sm text-emerald-300 placeholder:text-emerald-500/50" />
          <input type="text" placeholder="Order ID" value={manualOrderId} onChange={(e) => setManualOrderId(e.target.value.replace(/\s/g, ""))} className="col-span-2 w-full rounded-lg border border-emerald-500/30 bg-black/50 px-3 py-2 text-sm text-emerald-300 placeholder:text-emerald-500/50" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-emerald-400/80 mb-1">Upload screenshot (optional)</label>
        <input type="file" accept="image/*" onChange={onFileChange} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-500/20 file:text-emerald-400" />
      </div>
      {stage === "scanning" && (
        <div className="relative rounded-xl overflow-hidden border border-emerald-500/30 h-48 bg-black/50">
          {preview && <img src={preview} alt="" className="w-full h-full object-contain opacity-50" />}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/60">
            <p className="text-sm font-medium text-emerald-400">Scanning…</p>
          </div>
        </div>
      )}
      {(stage === "submit" || canSubmit) && (
        <div className="space-y-3">
          {(extracted || effectiveUtr || effectiveTransId) && (
            <div className={`flex gap-4 p-4 rounded-xl border ${boxCls}`}>
              {preview && <img src={preview} alt="Screenshot" className="w-24 h-24 object-cover rounded-lg border border-emerald-500/30 shrink-0" />}
              <div className="flex-1 text-sm space-y-1">
                {(effectiveUtr || extracted?.utr) && <p><span className="text-emerald-500/80">UTR:</span> <span className="text-emerald-400">{effectiveUtr || extracted?.utr}</span></p>}
                {(effectiveTransId || extracted?.transId) && <p><span className="text-emerald-500/80">Txn ID:</span> <span className="text-emerald-400">{effectiveTransId || extracted?.transId}</span></p>}
                {(effectiveOrderId || extracted?.orderId) && <p><span className="text-emerald-500/80">Order ID:</span> <span className="text-emerald-400">{effectiveOrderId || extracted?.orderId}</span></p>}
                {extracted?.amount != null && extracted.amount > 0 && <p><span className="text-emerald-500/80">Amount:</span> ₹{extracted.amount}</p>}
              </div>
            </div>
          )}
          <button type="button" onClick={submit} disabled={loading} className="w-full py-3 font-semibold rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30">
            {loading ? "Submitting…" : "Submit for approval"}
          </button>
        </div>
      )}
    </div>
  )
}

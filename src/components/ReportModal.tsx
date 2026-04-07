"use client"

import { useState, useCallback } from "react"

export default function ReportModal({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const captureAndSubmit = useCallback(async () => {
    if (!reason.trim()) {
      setError("Please enter a reason")
      return
    }
    setLoading(true)
    setError("")
    try {
      let screenshot = ""
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const { default: html2canvas } = await import("html2canvas")
        const canvas = await html2canvas(document.body, {
          useCORS: true,
          allowTaint: true,
          scale: 0.5,
          logging: false
        })
        screenshot = canvas.toDataURL("image/png")
      }
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reason: reason.trim(),
          screenshot,
          pageUrl: typeof window !== "undefined" ? window.location.href : ""
        })
      })
      const j = await res.json().catch(() => ({}))
      if (j?.ok) {
        setDone(true)
        setReason("")
        setTimeout(() => {
          onClose()
          setDone(false)
        }, 1500)
      } else {
        setError(j?.error || "Failed to submit")
      }
    } catch (e) {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [reason, onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md"
      onClick={() => !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/12 bg-navy-950/95 backdrop-blur-2xl shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h2 id="report-modal-title" className="text-lg font-bold text-white tracking-tight">
              Report an issue
            </h2>
            <p className="text-xs text-white/45 mt-1 leading-relaxed">
              A screenshot of this page will be attached. Describe what went wrong.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="report-reason" className="form-ui-label-dark">
            What happened?
          </label>
          <textarea
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Steps to reproduce, error messages, or anything that helps us fix it…"
            rows={5}
            className="modal-input-enhanced text-white min-h-[130px] resize-y leading-relaxed"
            disabled={loading}
          />
        </div>

        {error && (
          <p className="mt-3 text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="mt-3 text-sm font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2.5">
            Report submitted. Thank you!
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="sm:flex-1 py-3.5 rounded-xl border border-white/12 bg-white/5 text-white/85 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all active:scale-[0.98] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={captureAndSubmit}
            disabled={loading}
            className="sm:flex-1 py-3.5 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  )
}

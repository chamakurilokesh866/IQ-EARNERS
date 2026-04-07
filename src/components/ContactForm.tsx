"use client"

import { useState, useEffect } from "react"
import { useBootstrap } from "@/hooks/useBootstrap"
import { fetchWithCsrf } from "@/lib/fetchWithCsrf"
import { PARENT_COMPANY_NAME } from "@/lib/seo"
import { CheckIcon, BotIcon, MailIcon } from "./AnimatedIcons"

export default function ContactForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; code?: string; error?: string } | null>(null)
  const [trackCode, setTrackCode] = useState("")
  const [trackResult, setTrackResult] = useState<{ found: boolean; status?: string; adminReply?: string } | null>(null)
  const [tracking, setTracking] = useState(false)
  const [website, setWebsite] = useState("") // Honeypot FIELD
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [bypassingAi, setBypassingAi] = useState(false)

  // Auto-fill for logged-in users
  const { data: bootstrap } = useBootstrap()
  useEffect(() => {
    if (bootstrap?.username && !name) setName(bootstrap.username)
  }, [bootstrap, name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setResult(null)

    // AI Intercept Step — try to resolve automatically before creating a ticket
    if (!bypassingAi) {
      try {
        const aiReq = await fetch("/api/ai/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, name, subject, website })
        })
        const aiJson = await aiReq.json().catch(() => ({}))
        if (aiJson?.ok && aiJson.escalate === false && aiJson.reply) {
          setAiResponse(aiJson.reply)
          setSending(false)
          return
        }
      } catch (e) {
        // Silently escalate if AI fails
      }
    }

    try {
      const res = await fetchWithCsrf("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, subject, message, website })
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j?.ok) {
        setResult({ ok: true, code: j.code })
        setName("")
        setEmail("")
        setSubject("")
        setMessage("")
        setAiResponse(null)
        setBypassingAi(false)
      } else {
        setResult({ ok: false, error: j?.error || "Failed to send" })
      }
    } catch {
      setResult({ ok: false, error: "Something went wrong" })
    } finally {
      setSending(false)
    }
  }

  const handleTrack = async () => {
    if (!trackCode.trim()) return
    setTracking(true)
    setTrackResult(null)
    try {
      const res = await fetch(`/api/sponsors/status?code=${encodeURIComponent(trackCode.trim())}`)
      const j = await res.json().catch(() => ({}))
      if (j?.ok && j.found) {
        setTrackResult({ found: true, status: j.data?.status, adminReply: j.data?.adminReply })
      } else {
        setTrackResult({ found: false })
      }
    } catch {
      setTrackResult({ found: false })
    } finally {
      setTracking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-[#e8eaf0] dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-[#f1f5f9] dark:border-white/10">
          <div className="w-11 h-11 rounded-2xl bg-[#7c3aed] flex items-center justify-center shadow-lg shadow-blue-500/25">
            <MailIcon size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1a2340] dark:text-slate-100 uppercase tracking-tight">
              Contact Support
            </h2>
            <p className="text-xs text-[#64748b] dark:text-slate-400 font-bold mt-0.5">Typically addressed within 1–2 business days.</p>
          </div>
        </div>

        {result?.ok ? (
          <div className="mt-6 text-center py-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 animate-fade">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4 shadow-sm">
              <CheckIcon size={32} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">Message Sent!</div>
            <p className="mt-2 text-sm text-emerald-800/60 dark:text-emerald-300/80 font-bold tracking-tight">Tracking code: <span className="font-mono text-[#7c3aed] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/50">{result.code}</span></p>
            <button type="button" onClick={() => setResult(null)} className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">Send Another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div>
                <label htmlFor="contact-name" className="form-ui-label-light ml-0.5">Full name</label>
                <input id="contact-name" required value={name} onChange={(e) => setName(e.target.value)} className="form-ui-input-light" placeholder="Enter your name" />
              </div>
              <div>
                <label htmlFor="contact-email" className="form-ui-label-light ml-0.5">Official email</label>
                <input id="contact-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-ui-input-light" placeholder="you@example.com" autoComplete="email" />
              </div>
            </div>
            <div>
              <label htmlFor="contact-subject" className="form-ui-label-light ml-0.5">Subject</label>
              <input id="contact-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="form-ui-input-light" placeholder="What can we help you with?" />
            </div>
            <div>
              <label htmlFor="contact-message" className="form-ui-label-light ml-0.5">Inquiry details</label>
              <textarea id="contact-message" required value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="form-ui-textarea-light resize-y min-h-[140px]" placeholder="Provide as much detail as possible…" />
            </div>

            <div className="hidden" aria-hidden="true">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
            </div>
            {result?.error && <div className="text-xs text-red-700 dark:text-red-300 font-bold bg-red-50 dark:bg-red-950/40 p-3.5 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm">{result.error}</div>}

            {aiResponse && (
              <div className="p-6 rounded-3xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-[#1a2340] dark:text-slate-100 animate-slide-up shadow-sm">
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                    <BotIcon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-[#1a2340] dark:text-slate-100">IQ Earners AI Support · {PARENT_COMPANY_NAME}</div>
                    <div className="text-[9px] text-blue-600 dark:text-blue-400 uppercase font-black tracking-widest">Instant Resolution</div>
                  </div>
                  <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 uppercase">Live</span>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-[#1a2340] dark:text-slate-200 bg-white/60 dark:bg-slate-900/60 rounded-2xl p-4 border border-blue-200/50 dark:border-white/10 font-bold shadow-inner">{aiResponse}</div>
                <div className="mt-5 pt-5 border-t border-blue-100 dark:border-white/10 flex flex-col sm:flex-row gap-3">
                  <button type="button" onClick={() => { setAiResponse(null); setMessage(""); setSubject(""); }} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-700 shadow-md transition-all active:scale-95 uppercase tracking-wide">
                    ✓ Resolved
                  </button>
                  <button type="button" onClick={(e) => { setBypassingAi(true); handleSubmit(e as any); }} className="flex-1 py-3 rounded-xl bg-white dark:bg-slate-800 border border-[#e8eaf0] dark:border-white/10 text-[#64748b] dark:text-slate-300 font-black text-xs hover:bg-[#f8fafc] dark:hover:bg-slate-700 hover:text-[#1a2340] dark:hover:text-slate-100 transition-all active:scale-95 uppercase tracking-wide">
                    Speak to Human →
                  </button>
                </div>
              </div>
            )}

            {!aiResponse && (
              <button type="submit" disabled={sending} className="w-full h-14 rounded-2xl bg-[#7c3aed] text-white font-black text-sm hover:bg-blue-600 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25 uppercase tracking-widest disabled:opacity-50 disabled:shadow-none">
                {sending ? "Processing…" : "Submit ticket"}
              </button>
            )}
          </form>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-[#e8eaf0] dark:border-white/10 shadow-sm">
        <h3 className="form-ui-label-light mb-3">Track status</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={trackCode} onChange={(e) => setTrackCode(e.target.value)} className="form-ui-input-light flex-1 font-mono text-sm min-h-0" placeholder="Inquiry ID" aria-label="Inquiry tracking code" />
          <button type="button" onClick={handleTrack} disabled={tracking} className="shrink-0 h-12 px-8 rounded-xl bg-[#1a2340] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#252f4a] transition-all active:scale-[0.98] disabled:opacity-50">
            {tracking ? "Syncing…" : "Look up"}
          </button>
        </div>
        {trackResult && (
          <div className={`mt-4 rounded-2xl p-4 animate-fade ${trackResult.found ? "bg-[#f8fafc] dark:bg-slate-800/60 border border-[#e8eaf0] dark:border-white/10" : "bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50"}`}>
            {trackResult.found ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-[#64748b] dark:text-slate-400 uppercase tracking-widest">Current Status</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${trackResult.status === "accepted" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : trackResult.status === "rejected" ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300" : "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"}`}>
                    {trackResult.status === "accepted" ? "Resolved" : trackResult.status === "rejected" ? "Declined" : "In Progress"}
                  </span>
                </div>
                {trackResult.adminReply && <p className="text-sm font-bold text-[#1a2340] dark:text-slate-100 leading-relaxed bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-[#e8eaf0] dark:border-white/10">{trackResult.adminReply}</p>}
              </div>
            ) : (
              <span className="text-red-700 dark:text-red-300 text-xs font-black">ID not found. Verify and try again.</span>
            )}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-[10px] text-[#94a3b8] dark:text-slate-500 font-black uppercase tracking-widest">Help Center: contact@iqearners.online</p>
      </div>
    </div>
  )
}

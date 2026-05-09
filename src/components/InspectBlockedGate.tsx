"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"

const InspectUnblockForm = dynamic(() => import("./InspectUnblockForm"), { ssr: false })

type Step = "main" | "scanner" | "upload" | "awaiting" | "congrats"

export default function InspectBlockedGate() {
  const [blocked, setBlocked] = useState<{ reason: string } | null>(null)
  const [checked, setChecked] = useState(false)
  const [step, setStep] = useState<Step>("main")
  const [amount, setAmount] = useState(50)
  const [qrUrl, setQrUrl] = useState("")
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [ip, setIp] = useState("...")
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [appeal, setAppeal] = useState("")
  const terminalRef = useRef<HTMLDivElement>(null)

  const addLine = useCallback((line: string) => {
    setTerminalLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`].slice(-8))
  }, [])

  const checkBlocked = useCallback(async () => {
    try {
      const r = await fetch("/api/security/check-blocked", { cache: "no-store", credentials: "include" })
      const j = await r.json().catch(() => ({}))
      if (j?.blocked) {
        setBlocked({ reason: j.reason ?? "Unauthorized use of developer tools. Security protocols engaged." })
        setIp(j.ip ?? "...")
      }
    } catch { }
    setChecked(true)
  }, [])

  useEffect(() => {
    checkBlocked()
  }, [checkBlocked])

  useEffect(() => {
    if (blocked) {
      fetch("/api/settings", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          const d = j?.data ?? {}
          setAmount(Math.max(1, Number(d.blockedAmount ?? 50)))
          setQrUrl(d.blockedQrUrl ?? "")
        })
        .catch(() => { })

      const sequences = [
        "Initializing kernel panic...",
        "Tracing IP address trace-root...",
        "Identity logged: [USER_IP_REDACTED]",
        "Security violation detected: INSPECT_ELEMENT",
        "Encrypted database access restricted.",
        "Awaiting manual administrative override...",
      ]

      sequences.forEach((s, i) => {
        setTimeout(() => addLine(s), i * 800)
      })
    }
  }, [blocked, addLine])

  useEffect(() => {
    if (step !== "awaiting" || !paymentId) return
    const poll = async () => {
      const r = await fetch(`/api/payments/status?id=${paymentId}`, { cache: "no-store" })
      const j = await r.json().catch(() => ({}))
      if (j?.status === "success") setStep("congrats")
    }
    const t = setInterval(poll, 1500)
    poll()
    return () => clearInterval(t)
  }, [step, paymentId])

  useEffect(() => {
    if (!checked || !blocked) return
    if (typeof document === "undefined") return
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [checked, blocked])

  if (!checked || !blocked) return null

  const paperCardCls = "bg-white/10 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/20 dark:border-white/10 text-slate-800 dark:text-slate-100 relative shadow-2xl"
  const titleCls = "font-black tracking-tight uppercase"

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-start sm:justify-center bg-black/90 p-4 sm:p-8 select-none overflow-y-auto backdrop-blur-sm scrollbar-none pt-24 pb-20">

      <AnimatePresence mode="wait">
        {step === "congrats" ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`w-full max-w-lg rounded-xl border-2 border-emerald-500 p-8 text-center bg-black`}>
            <div className="text-5xl mb-4">🔓</div>
            <h1 className="text-2xl font-black text-emerald-500 mb-2">ACCESS RESTORED</h1>
            <p className="text-sm text-emerald-400/80 mb-6">Security protocols cleared. IP whitelist updated.</p>
            <button onClick={() => window.location.reload()} className="w-full py-4 rounded-lg bg-emerald-500 text-black font-bold uppercase hover:scale-[1.02] transition-transform">Re-enter System</button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm sm:max-w-md rounded-2xl border ${paperCardCls} p-4 sm:p-5`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                <span className={`text-amber-600 dark:text-amber-400 ${titleCls}`}>Access Restricted</span>
              </div>
              <span className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest hidden sm:inline">Security ID {Date.now().toString().slice(-6)}</span>
            </div>

            {/* Terminal Feed */}
            <div className="bg-slate-100/80 dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/10 p-3 mb-5 h-24 overflow-y-auto scrollbar-none" ref={terminalRef}>
              {terminalLines.map((line, i) => (
                <div key={i} className="text-[10px] text-slate-600 dark:text-white/65 mb-1 leading-tight">{line}</div>
              ))}
              <div className="text-[10px] text-slate-500 dark:text-cyan-300 animate-pulse mt-1">&gt; Awaiting verification flow...</div>
            </div>

            {step === "main" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">IP Blocked: <span className="text-amber-600 dark:text-amber-400">{ip}</span></h2>
                  <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed uppercase">This IP was flagged by security rules. To restore access on this IP, verification fee is ₹{amount}.</p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
                  <span className="block text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 mb-1">Reason:</span>
                  <p className="text-sm text-slate-700 dark:text-amber-100/80 italic">&quot;{blocked.reason}&quot;</p>
                </div>

                <div className="bg-amber-950/20 border border-amber-900/35 rounded-lg p-4 text-left">
                  <span className="block text-[10px] uppercase font-bold text-amber-400 mb-2 tracking-widest">Alternative Access Options</span>
                  <ul className="text-[11px] text-amber-100/80 space-y-1.5 list-disc pl-4">
                    <li>Try from a different trusted network (mobile data or another Wi-Fi).</li>
                    <li>Disable VPN/proxy/ad-block extensions and retry.</li>
                    <li>If this was a false alert, submit payment proof/appeal to restore current IP access.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <button onClick={() => setStep("scanner")} className="w-full py-3 rounded bg-amber-600 text-white font-black uppercase hover:bg-amber-500 transition-colors shadow-lg shadow-amber-600/20">Pay ₹{amount} to Restore Access</button>
                  <p className="text-[9px] text-center text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest leading-normal">
                    Use a valid payment proof for faster verification.
                  </p>
                </div>
              </motion.div>
            )}

            {step === "scanner" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1 uppercase">Payment Channel Open</h2>
                  <p className="text-[10px] text-slate-600 dark:text-white/60">Scan and transfer exactly <span className="text-slate-900 dark:text-white">₹{amount}</span> to initialize unblock sequence.</p>
                </div>

                <div className="relative mx-auto w-44 h-44 bg-white rounded-xl p-2 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                  {qrUrl ? <img src={qrUrl} alt="QR" className="w-full h-full object-contain" /> : <div className="h-full w-full flex items-center justify-center text-black text-xs">QR MISSING</div>}
                  <div className="absolute inset-0 border-2 border-red-600 rounded-xl overflow-hidden pointer-events-none">
                    <motion.div animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute w-full h-1 bg-red-600 shadow-[0_0_15px_red] z-10" />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={() => setStep("upload")} className="w-full py-3 rounded border-2 border-emerald-500/50 text-emerald-600 dark:text-emerald-300 font-black uppercase hover:bg-emerald-500/10">I have completed the payment</button>
                  <button onClick={() => setStep("main")} className="text-xs text-slate-500 dark:text-white/50 uppercase font-black hover:text-slate-700 dark:hover:text-white transition-colors">Back</button>
                </div>
              </motion.div>
            )}

            {step === "upload" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase">Upload Proof</h2>
                  <button onClick={() => setStep("scanner")} className="text-xs text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white uppercase">Back</button>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/15 rounded-xl p-4 ring-1 ring-slate-200 dark:ring-white/10">
                    <label htmlFor="inspect-appeal" className="block text-[10px] uppercase font-bold text-slate-600 dark:text-white/70 mb-2 tracking-widest">
                      Optional appeal message
                    </label>
                    <textarea
                      id="inspect-appeal"
                      placeholder="Explain context (optional)…"
                      value={appeal}
                      onChange={(e) => setAppeal(e.target.value)}
                      rows={4}
                      className="w-full min-h-[100px] rounded-xl border border-slate-300 dark:border-white/20 bg-white dark:bg-black/30 px-3.5 py-3 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 outline-none focus:border-amber-400/60 focus:ring-2 focus:ring-amber-500/20 transition-all resize-y leading-relaxed"
                    />
                  </div>

                  <InspectUnblockForm amount={amount} appeal={appeal} onSuccess={(id) => { setPaymentId(id); setStep("awaiting"); addLine("Payload submitted. Peer verification in progress."); }} onError={(msg) => setUploadError(msg)} />
                  {uploadError && <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase">{uploadError}</div>}
                </div>

                <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300 mb-2">Next steps after upload</p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-700 dark:text-white/70">
                    <li>Your payment + proof is submitted to admin review queue.</li>
                    <li>Stay on this page and keep network active.</li>
                    <li>Once approved, access is restored automatically.</li>
                  </ol>
                </div>
              </motion.div>
            )}

            {step === "awaiting" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="flex gap-2">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.div key={i} animate={{ height: [10, 30, 10], opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay }} className="w-1.5 bg-amber-500 rounded-full" />
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-2">Verification Pending</h2>
                  <p className="text-[10px] text-slate-600 dark:text-white/60 uppercase max-w-xs mx-auto">Admin is reviewing your transaction data. Please keep this page open.</p>
                </div>
                <div className="mx-auto max-w-xs rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-left">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300 mb-1">What happens next</p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-700 dark:text-white/70">
                    <li>Review status is checked automatically.</li>
                    <li>Approval triggers instant unlock for this IP.</li>
                    <li>You can re-enter without another payment.</li>
                  </ul>
                </div>
              </motion.div>
            )}

            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 text-center">
              <span className="text-[8px] text-slate-400 dark:text-white/35 uppercase font-mono">Security reference: {Date.now().toString(16)} · IP {ip}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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

  if (!checked || !blocked) return null

  const hackCardCls = "bg-black/90 backdrop-blur-xl border border-red-500/30 text-emerald-400 overflow-hidden relative"
  const glitchTextCls = "font-mono tracking-tighter uppercase"

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#050101] p-4 font-mono select-none overflow-hidden">
      {/* Background Matrix/Glitch Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[size:100%_2px,3px_100%] pointer-events-none" />
        <motion.div
          animate={{ backgroundPosition: ["0px 0px", "0px 1000px"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-[url('/grid.svg')] bg-[size:40px_40px]"
        />
      </div>

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
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-xl rounded-xl border-2 border-red-900/50 ${hackCardCls} p-6 sm:p-8 shadow-[0_0_80px_rgba(220,38,38,0.1)]`}
          >
            {/* Header Glitch */}
            <div className="flex items-center justify-between border-b border-red-900/30 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
                <span className={`text-red-500 font-black ${glitchTextCls}`}>Access Restricted</span>
              </div>
              <span className="text-[10px] text-red-900 font-bold uppercase tracking-widest hidden sm:inline">Unauthorized_Tool_Used_Detected_Log_ID_{Date.now().toString().slice(-6)}</span>
            </div>

            {/* Terminal Feed */}
            <div className="bg-black/80 rounded border border-red-900/20 p-4 mb-6 h-32 overflow-y-auto scrollbar-none" ref={terminalRef}>
              {terminalLines.map((line, i) => (
                <div key={i} className="text-[10px] text-red-500/70 mb-1 leading-tight">{line}</div>
              ))}
              <div className="text-[10px] text-emerald-500 animate-pulse mt-1">&gt; SYSTEM_IDLE_AWAITING_PAYMENT_PROOF_</div>
            </div>

            {step === "main" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">IP Blocked: <span className="text-red-600">{ip}</span></h2>
                  <p className="text-xs text-red-400/60 leading-relaxed uppercase">The system has flagged your activity as a security risk. To override this block, a manual verification fee of ₹{amount} is required.</p>
                </div>

                <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-4">
                  <span className="block text-[10px] uppercase font-bold text-red-500 mb-1">Reason:</span>
                  <p className="text-sm text-red-200/80 italic">&quot;{blocked.reason}&quot;</p>
                </div>

                <div className="space-y-3">
                  <button onClick={() => setStep("scanner")} className="w-full py-4 rounded bg-red-600 text-white font-black uppercase hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">Pay ₹{amount} to Clear Record</button>
                  <p className="text-[9px] text-center text-red-900 font-bold uppercase tracking-widest leading-normal">
                    Failure to comply may result in permanent blacklisting of this IP across all associated networks.
                  </p>
                </div>
              </motion.div>
            )}

            {step === "scanner" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-lg font-black text-white mb-1 uppercase">Payment Channel Open</h2>
                  <p className="text-[10px] text-red-400/60">Scan and transfer exactly <span className="text-white">₹{amount}</span> to initialize unblock sequence.</p>
                </div>

                <div className="relative mx-auto w-52 h-52 bg-white rounded-xl p-2 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                  {qrUrl ? <img src={qrUrl} alt="QR" className="w-full h-full object-contain" /> : <div className="h-full w-full flex items-center justify-center text-black text-xs">QR MISSING</div>}
                  <div className="absolute inset-0 border-2 border-red-600 rounded-xl overflow-hidden pointer-events-none">
                    <motion.div animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute w-full h-1 bg-red-600 shadow-[0_0_15px_red] z-10" />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={() => setStep("upload")} className="w-full py-4 rounded border-2 border-emerald-500/50 text-emerald-400 font-black uppercase hover:bg-emerald-500/10">I have completed the payment</button>
                  <button onClick={() => setStep("main")} className="text-xs text-red-900 uppercase font-black hover:text-red-600 transition-colors">Abort</button>
                </div>
              </motion.div>
            )}

            {step === "upload" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-white uppercase">Upload Proof</h2>
                  <button onClick={() => setStep("scanner")} className="text-xs text-red-700 hover:text-red-500 uppercase">Back</button>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-950/10 border border-red-900/35 rounded-xl p-4 ring-1 ring-red-900/20">
                    <label htmlFor="inspect-appeal" className="block text-[10px] uppercase font-bold text-red-400/90 mb-2 tracking-widest">
                      Optional appeal message
                    </label>
                    <textarea
                      id="inspect-appeal"
                      placeholder="Explain context (optional)…"
                      value={appeal}
                      onChange={(e) => setAppeal(e.target.value)}
                      rows={4}
                      className="w-full min-h-[100px] rounded-xl border border-red-900/40 bg-black/40 px-3.5 py-3 text-sm text-red-100 placeholder:text-red-900/80 outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-600/20 transition-all resize-y leading-relaxed"
                    />
                  </div>

                  <InspectUnblockForm amount={amount} appeal={appeal} onSuccess={(id) => { setPaymentId(id); setStep("awaiting"); addLine("Payload submitted. Peer verification in progress."); }} onError={(msg) => setUploadError(msg)} />
                  {uploadError && <div className="p-3 bg-red-900/20 border border-red-900 text-red-500 text-[10px] font-bold uppercase">{uploadError}</div>}
                </div>
              </motion.div>
            )}

            {step === "awaiting" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="flex gap-2">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <motion.div key={i} animate={{ height: [10, 30, 10], opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay }} className="w-1.5 bg-red-600 rounded-full" />
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase mb-2">VERIFICATION PENDING</h2>
                  <p className="text-[10px] text-red-400/60 uppercase max-w-xs mx-auto">Admin is reviewing your transaction data. Do not close this terminal or restart your connection.</p>
                </div>
              </motion.div>
            )}

            {/* Footer Hash */}
            <div className="mt-8 pt-4 border-t border-red-900/20 text-center">
              <span className="text-[8px] text-red-900/40 uppercase font-mono">System Secure | MD5: {Date.now().toString(16)} | Node: {ip.replace(/\./g, ":")}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

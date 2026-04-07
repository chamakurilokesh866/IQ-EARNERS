"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import logoPng from "../app/prizes/icon.png"

export default function ShareCard({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const [copiedInstagram, setCopiedInstagram] = useState(false)
  const confettiRef = useRef<HTMLDivElement | null>(null)
  const qrSrc = url ? `/api/qr?data=${encodeURIComponent(url)}&s=180` : ""
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(url)
      setCopied(true)
      if (confettiRef.current) {
        confettiRef.current.classList.remove("animate-confetti")
        void confettiRef.current.offsetWidth
        confettiRef.current.classList.add("animate-confetti")
      }
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }
  const shareText = `Join IQ Earners and get rewards! Use my referral: ${url} (Code: ${code})`
  const share = async (target: "native" | "whatsapp" | "instagram" | "twitter" | "telegram") => {
    if (target === "native" && typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "IQ Earners", text: shareText, url })
        return
      } catch {}
    }
    let href = ""
    if (target === "whatsapp") href = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    else if (target === "telegram") href = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`
    else if (target === "twitter") href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    else if (target === "instagram") {
      // Instagram has no direct share URL; copy text so user can paste in Stories/DM
      try {
        await navigator.clipboard?.writeText(shareText)
        setCopiedInstagram(true)
        setTimeout(() => setCopiedInstagram(false), 2000)
      } catch {}
      return
    }
    if (href) window.open(href, "_blank")
  }
  useEffect(() => {}, [])
  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-200/20 bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 sm:p-8 animate-fade shadow-2xl">
      <div ref={confettiRef} className="pointer-events-none absolute inset-0 opacity-0"></div>
      
      {/* Decorative background elements */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-8">
        {/* Left side: Mascot/Logo */}
        <div className="shrink-0 rounded-3xl p-1 bg-gradient-to-br from-blue-400 to-indigo-600 shadow-xl shadow-blue-500/20 animate-pulse-glow">
          <div className="bg-white rounded-[1.4rem] p-4">
            <Image src={logoPng} alt="IQ Earners" className="h-20 w-20 rounded-2xl object-contain hover:scale-110 transition-transform duration-500" />
          </div>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">Growth Network</div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Your Referral Assets</h3>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Referral Link
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="font-bold text-blue-100 break-all text-sm group-hover:text-white transition-colors">{url}</div>
                <button 
                  onClick={copy}
                  className="shrink-0 px-4 py-2 rounded-xl bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-400 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
              <div className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Referral Code
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-2xl font-black text-emerald-400 tracking-[0.2em] font-mono group-hover:text-emerald-300 transition-colors">{code}</div>
                <button 
                  onClick={() => {
                    navigator.clipboard?.writeText(code)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="shrink-0 px-4 py-2 rounded-xl bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  {copied ? "Copied" : "Copy Code"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="w-full text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Quick Share Channels</div>
            <button className="h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2" onClick={() => share("native")}>Share</button>
            <button className="h-9 px-4 rounded-xl bg-[#25D366] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#128C7E] transition-all flex items-center gap-2 shadow-lg shadow-[#25D366]/10" onClick={() => share("whatsapp")}>WhatsApp</button>
            <button className="h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2" onClick={() => share("twitter")}>Twitter</button>
            <button className="h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2" onClick={() => share("telegram")}>Telegram</button>
            <button className="h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2" onClick={() => share("instagram")}>{copiedInstagram ? "Copied!" : "Instagram"}</button>
          </div>
        </div>

        {/* Right side: QR Code */}
        <div className="shrink-0 w-full lg:w-auto flex flex-col items-center gap-4">
          <div className="p-4 rounded-[2rem] bg-white shadow-2xl shadow-blue-500/10 border border-blue-100/20 animate-pop scale-90 lg:scale-100">
            {qrSrc ? (
              <Image src={qrSrc} alt="Referral QR" width={160} height={160} className="rounded-2xl" />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-[10px] font-black text-blue-900/20 uppercase tracking-widest text-center px-8">QR Generating…</div>
            )}
          </div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] text-center">Scan to Join</p>
        </div>
      </div>
    </div>
  )
}

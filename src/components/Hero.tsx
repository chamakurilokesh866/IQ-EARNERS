"use client"
import { useEffect, useState } from "react"
import TransitionLink from "./TransitionLink"
import Image from "next/image"
import logoPng from "../app/prizes/icon.png"
import PaymentModal from "./PaymentModal"
import LoginModal from "./LoginModal"
import { useBootstrap } from "@/hooks/useBootstrap"
import { useToast } from "@/context/ToastContext"

export default function Hero() {
  const [title, setTitle] = useState<string>("Tournament")
  const [desc, setDesc] = useState<string>("")
  const [showLogin, setShowLogin] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const { data: bootstrap } = useBootstrap()
  const { showToast } = useToast()
  const paid = bootstrap?.paid ?? false
  const fee = bootstrap?.entryFee ?? 100

  useEffect(() => {
    fetch("/api/content", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const h = j?.data?.hero
        if (h?.title) setTitle(h.title)
        if (h?.description) setDesc(h.description)
      })
      .catch(() => showToast("Could not load content"))
    fetch("/api/tournaments", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const t = Array.isArray(j?.data) && j.data.length ? j.data[j.data.length - 1] : null
        if (t) {
          setTitle(t.title ?? "Tournament")
          setDesc(t.description ?? "")
        }
      })
      .catch(() => showToast("Could not load tournament info"))
  }, [showToast])

  const handlePaymentSuccess = () => {
    setShowPay(false)
    try { if (typeof window !== "undefined") window.localStorage.setItem("paid", "1") } catch {}
    window.dispatchEvent(new CustomEvent("bootstrap-invalidate"))
    window.location.reload()
  }

  return (
    <>
      <div className="relative text-center py-10 sm:py-20 animate-fade overflow-hidden">
        {/* Decorative background paper texture and subtle glow */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-blue-500/5 blur-[120px] rounded-full -z-10 animate-pulse-glow pointer-events-none" />

        <div className="flex flex-col items-center justify-center relative z-10">
          <div className="relative w-28 h-28 md:w-36 md:h-36 mb-8 transform hover:scale-110 transition-transform duration-700 ease-out cursor-pointer">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl animate-pulse-glow" />
            <Image 
              src={logoPng} 
              alt="IQ Earners Logo" 
              className="w-full h-full object-contain drop-shadow-lg relative z-10"
              priority
            />
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-[#1a2340] mb-6 select-none animate-slide-up">
            IQ EARNERS
          </h1>
        </div>
        
        {desc && (
          <p className="mt-4 text-lg md:text-2xl text-[#64748b] font-bold animate-slide-up max-w-2xl mx-auto leading-relaxed px-6" style={{ animationDelay: "0.1s" }}>
            {desc}
          </p>
        )}

        <div className="mt-12 flex flex-col items-center gap-8 animate-slide-up relative z-10" style={{ animationDelay: "0.2s" }}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full px-6 sm:w-auto">
            {!paid && (
              <button 
                onClick={() => setShowPay(true)}
                className="w-full sm:w-auto h-16 px-10 rounded-2xl bg-[#7c3aed] text-white text-lg font-black shadow-xl shadow-blue-500/30 hover:bg-blue-600 hover:translate-y-[-4px] active:translate-y-0 transition-all duration-300 uppercase tracking-widest"
              >
                Enroll Now
              </button>
            )}
            <TransitionLink 
              href="/tournaments" 
              className="w-full sm:w-auto h-16 px-10 rounded-2xl bg-white border-2 border-[#e8eaf0] text-[#1a2340] text-lg font-black hover:bg-[#f8fafc] hover:border-[#7c3aed] hover:translate-y-[-4px] active:translate-y-0 shadow-lg shadow-black/5 transition-all duration-300 uppercase tracking-widest flex items-center justify-center"
            >
              Start Quiz
            </TransitionLink>
          </div>
          
          <button 
            onClick={() => setShowLogin(true)}
            className="group flex items-center gap-2 text-sm text-[#94a3b8] font-black hover:text-[#1a2340] transition-colors uppercase tracking-[0.2em]"
          >
            Already a user? <span className="text-[#7c3aed] group-hover:underline underline-offset-4">Sign In</span>
          </button>
        </div>
      </div>

      {/* Login Modal – uses LoginModal for consistent blocked-user handling */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      {/* Payment Modal */}
      {showPay && <PaymentModal amount={fee} onSuccess={handlePaymentSuccess} onClose={() => setShowPay(false)} />}
    </>
  )
}

"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { triggerHapticImpact } from "@/lib/haptics"

interface StickyIntroCTAProps {
  fee: number
  onParticipate: () => void
}

export default function StickyIntroCTA({ fee, onParticipate }: StickyIntroCTAProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show when user scrolls past 600px (roughly Hero + Banner)
      setVisible(window.scrollY > 600)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleClick = () => {
    void triggerHapticImpact("medium")
    onParticipate()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 lg:hidden"
        >
          <div className="mx-auto max-w-lg bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-[0_-15px_60px_rgba(0,0,0,0.7)] flex items-center justify-between gap-4">
             <button
               onClick={handleClick}
               className="flex-1 rounded-xl bg-primary py-4 px-6 text-sm font-black text-white uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-[0_4px_20px_rgba(59,130,246,0.3)]"
             >
               Get Started — ₹{fee}
             </button>
             
             <div className="shrink-0 pr-2 opacity-50 flex flex-col items-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                   <path d="m9 12 2 2 4-4"/>
                </svg>
                <span className="text-[7px] text-white/40 uppercase mt-1 font-bold tracking-tighter">Secure</span>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

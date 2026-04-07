"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function CookieBanner({ onVisibleChange }: { onVisibleChange?: (visible: boolean) => void }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      // Show almost immediately for priority
      const timer = setTimeout(() => {
        setShow(true)
        onVisibleChange?.(true)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [onVisibleChange])

  const handleAction = (type: "accept" | "decline") => {
    localStorage.setItem("cookie-consent", type)
    setShow(false)
    onVisibleChange?.(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="fixed top-2 sm:top-6 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[500px] z-[1000]"
        >
          <div className="bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex items-center gap-4">
             <div className="hidden sm:flex w-12 h-12 bg-white/5 rounded-2xl shrink-0 items-center justify-center text-2xl">
                🍪
             </div>
             
             <div className="flex-1">
               <h3 className="text-white font-black text-sm uppercase tracking-widest mb-1">Privacy Engine</h3>
               <p className="text-white/50 text-[10px] sm:text-[11px] leading-snug font-medium">
                 This platform uses elite identifiers to ensure secure gameplay and encrypted payments.
               </p>
             </div>

             <div className="flex flex-col gap-2 shrink-0">
               <button
                 onClick={() => handleAction("accept")}
                 className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter bg-primary text-black hover:scale-[1.05] transition-all"
               >
                 Accept
               </button>
               <button
                 onClick={() => handleAction("decline")}
                 className="px-6 py-2 text-[9px] font-bold text-white/40 hover:text-white transition-colors"
               >
                 Decline
               </button>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

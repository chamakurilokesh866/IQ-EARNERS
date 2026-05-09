"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export default function CookieBanner() {
  const [show, setShow] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === "/blocked" || pathname === "/unblock") {
      setShow(false)
      return
    }
    const consent = localStorage.getItem("cookie-consent")
    if (!consent) {
      const timer = setTimeout(() => {
        setShow(true)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  const handleAction = (type: "accept" | "decline") => {
    localStorage.setItem("cookie-consent", type)
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-4 inset-x-4 z-[1200] pointer-events-none"
        >
          <div className="max-w-3xl mx-auto pointer-events-auto rounded-2xl border border-white/15 bg-slate-950/90 backdrop-blur-xl px-4 py-3 sm:px-6 sm:py-5 shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-white font-bold text-sm">Cookie Preferences</h3>
                <p className="text-white/65 text-[11px] leading-relaxed">
                  We use essential cookies and optional analytics/ads cookies. You can accept or reject optional cookies.
                  {" "}
                  <Link href="/intro?legal=cookie" className="underline text-white hover:text-primary transition-colors">
                    Cookie Policy
                  </Link>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAction("decline")}
                  className="px-3 py-2 rounded-lg text-[11px] font-semibold text-white/80 hover:text-white border border-white/20 hover:border-white/35 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleAction("accept")}
                  className="px-3 py-2 rounded-lg text-[11px] font-semibold bg-primary text-white hover:brightness-110 transition-all"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

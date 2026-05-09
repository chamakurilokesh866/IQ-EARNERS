"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import ParentCompanyMark from "@/components/ParentCompanyMark"

export default function Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Show splash for 1.2s then redirect
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => {
        const ref = searchParams.get("ref")
        const url = ref ? `/intro?ref=${encodeURIComponent(ref)}` : "/intro"
        router.replace(url)
      }, 600) // Duration of fade out
    }, 1200)

    return () => clearTimeout(timer)
  }, [router, searchParams])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 font-serif app-page-surface">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence>
        {!exiting && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center z-10"
          >
            {/* Logo Icon */}
            <motion.div 
               initial={{ rotate: -10, opacity: 0 }}
               animate={{ rotate: 0, opacity: 1 }}
               transition={{ delay: 0.2, duration: 0.8 }}
               className="w-20 h-20 bg-gradient-to-br from-primary via-navy-600 to-navy-900 rounded-2xl border border-white/20 shadow-[0_0_50px_rgba(255,255,255,0.1)] flex items-center justify-center text-4xl font-black text-white mx-auto mb-8 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              IQ
            </motion.div>

            <motion.h1 
              className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              IQ Earners
            </motion.h1>

            <motion.div 
              className="flex items-center justify-center gap-3 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="h-[1px] w-8 bg-white/20" />
              <p className="text-navy-400 text-xs uppercase tracking-[0.2em] font-sans flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <span>Empowering Intelligence ·</span> <ParentCompanyMark className="!normal-case !tracking-normal text-xs" />
              </p>
              <div className="h-[1px] w-8 bg-white/20" />
            </motion.div>

            {/* Premium Loader */}
            <div className="mt-12 flex flex-col items-center">
              <div className="w-48 h-[2px] bg-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-primary to-transparent w-2/3"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="text-[10px] text-navy-500 mt-4 uppercase tracking-widest font-sans animate-pulse">Initializing Platform</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] pointer-events-none" />
    </main>
  )
}

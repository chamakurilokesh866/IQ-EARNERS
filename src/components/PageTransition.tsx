"use client"

import { motion, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect } from "react"

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/"
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const transition = reduceMotion
    ? { duration: 0.1, ease: "linear" as const }
    : { type: "spring" as const, stiffness: 350, damping: 30, mass: 0.5 }

  return (
    <motion.div
      key={pathname}
      initial={
        reduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 8, scale: 0.995 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={transition}
      className="app-page-root relative z-[1] flex min-h-[100dvh] w-full min-w-0 max-w-full flex-col items-stretch justify-start overflow-x-hidden bg-transparent text-slate-100"
    >
      <div className="relative z-[1] flex w-full min-w-0 min-h-0 flex-col items-stretch justify-start">
        {children}
      </div>
    </motion.div>
  )
}

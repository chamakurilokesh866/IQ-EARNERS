"use client"

import { motion, useReducedMotion } from "framer-motion"
import { usePathname } from "next/navigation"
import { useQuizFullscreen } from "@/context/QuizFullscreenContext"

/** Routes that ship their own full-viewport backdrop (avoid double layers). */
const SKIP_PATHS = new Set(["/intro"])

function shouldSkipAmbient(pathname: string) {
  if (SKIP_PATHS.has(pathname)) return true
  return false
}

export default function AppAmbientBackground() {
  const pathname = usePathname() ?? ""
  const { isActive: quizFullscreen } = useQuizFullscreen()
  const reduceMotion = useReducedMotion()

  if (shouldSkipAmbient(pathname) || quizFullscreen) return null

  const orbs = !reduceMotion

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#06040f]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,20,0.82)_0%,rgba(7,8,20,0.64)_34%,rgba(7,8,20,0.82)_100%)]" />

      {orbs ? (
        <>
          <motion.div
            className="absolute -top-[18%] -left-[12%] h-[min(72vw,520px)] w-[min(72vw,520px)] rounded-full bg-primary/[0.14] blur-[120px]"
            animate={{ scale: [1, 1.06, 1], x: [0, 24, 0], y: [0, 12, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-[12%] -right-[8%] h-[min(60vw,440px)] w-[min(60vw,440px)] rounded-full bg-accent/[0.11] blur-[100px]"
            animate={{ scale: [1, 1.08, 1], x: [0, -18, 0], y: [0, -16, 0] }}
            transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div
            className="absolute top-[42%] left-[55%] h-[min(45vw,320px)] w-[min(45vw,320px)] -translate-x-1/2 rounded-full bg-cyan-500/[0.06] blur-[90px]"
            animate={{ opacity: [0.5, 0.85, 0.5], scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </>
      ) : (
        <>
          <div className="absolute -top-[18%] -left-[12%] h-[min(72vw,520px)] w-[min(72vw,520px)] rounded-full bg-primary/[0.12] blur-[120px]" />
          <div className="absolute -bottom-[12%] -right-[8%] h-[min(60vw,440px)] w-[min(60vw,440px)] rounded-full bg-accent/[0.09] blur-[100px]" />
        </>
      )}

      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.1),transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_115%,rgba(6,182,212,0.12),transparent_60%)]"
        aria-hidden
      />

      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-55deg, transparent, transparent 3px, rgba(255,255,255,0.06) 3px, rgba(255,255,255,0.06) 4px)",
        }}
        aria-hidden
      />

      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{ backgroundImage: "url('/noise.svg')" }}
        aria-hidden
      />

      {!reduceMotion ? (
        <motion.div
          className="absolute inset-0 opacity-[0.05] mix-blend-soft-light"
          animate={{ backgroundPositionX: ["0%", "100%", "0%"], backgroundPositionY: ["0%", "100%", "0%"] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(168,85,247,0.2), transparent 35%, rgba(34,211,238,0.16) 60%, transparent 80%)",
            backgroundSize: "240% 240%",
          }}
          aria-hidden
        />
      ) : null}

      {!reduceMotion ? (
        <motion.div
          className="absolute inset-0 opacity-[0.04]"
          animate={{ opacity: [0.03, 0.055, 0.03] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
          }}
          aria-hidden
        />
      ) : null}
    </div>
  )
}

"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

const REPORT_DEBOUNCE_MS = 3000

function reportInspectDetected(type: string = "general") {
  const url = typeof window !== "undefined" ? window.location?.href ?? "" : ""
  fetch("/api/security/inspect-detected", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url, type })
  }).catch(() => { })
}

export default function InspectGuard() {
  const [showWarning, setShowWarning] = useState(false)
  const pathname = usePathname() ?? ""
  const lastReportRef = useRef(0)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [allowDeveloperOptions, setAllowDeveloperOptions] = useState(false)

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsAdmin(document.cookie.includes("role=admin"))
    }
    // Fetch global setting
    fetch("/api/settings")
      .then(res => res.json())
      .then(json => {
        if (json?.data?.allowDeveloperOptions) {
          setAllowDeveloperOptions(true)
        }
      })
      .catch(() => {})
  }, [])

  const isWhitelistedPath = pathname.startsWith("/admin") || pathname.includes("/more/admin")

  const triggerWarning = useCallback((type: string) => {
    if (isWhitelistedPath || isAdmin || allowDeveloperOptions) return // Never trigger on admin paths, for admin users, or if dev options allowed
    setShowWarning(true)
    const now = Date.now()
    if (now - lastReportRef.current > REPORT_DEBOUNCE_MS) {
      lastReportRef.current = now
      reportInspectDetected(type)
    }

    // Auto-block after 10 seconds of detection if they don't leave
    if (!warningTimeoutRef.current) {
      warningTimeoutRef.current = setTimeout(async () => {
        try {
          // Request server to block this IP
          await fetch("/api/security/inspect-detected", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ autoBlock: true, type: `Auto-block: ${type}`, url: window.location.href })
          })
          // Refresh to trigger blocked gate
          window.location.reload()
        } catch { }
      }, 10000)
    }
  }, [isWhitelistedPath, isAdmin, allowDeveloperOptions])

  const onResize = useCallback(() => {
    // Disabled devtools check via resize due to false positives with sidebars/touch
    return
  }, [])
  useEffect(() => {
    // 1. Block Context Menu
    const prevent = (e: Event) => {
      e.preventDefault()
      triggerWarning("context_menu")
    }

    // 2. Block Keyboard Shortcuts
    const preventKey = (e: KeyboardEvent) => {
      const k = e.key
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey

      // F12, Ctrl+U (Source), Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Element), Ctrl+S (Save)
      const isForbidden =
        k === "F12" ||
        (ctrl && k.toLowerCase() === "u") ||
        (ctrl && shift && k.toLowerCase() === "i") ||
        (ctrl && shift && k.toLowerCase() === "j") ||
        (ctrl && shift && k.toLowerCase() === "c") ||
        (ctrl && k.toLowerCase() === "s") ||
        (ctrl && k.toLowerCase() === "p") ||
        (ctrl && shift && k.toLowerCase() === "k") // Firefox console

      if (isForbidden) {
        e.preventDefault()
        triggerWarning("keyboard_shortcut")
      }
    }

    if (isWhitelistedPath || isAdmin || allowDeveloperOptions) return

    // Immediate check on mount
    onResize()

    // 4. Advanced DevTools Detection (Performance/Debugger Hybrid)
    const checkDebugger = () => {
      if (isWhitelistedPath || isAdmin || allowDeveloperOptions) return
      
      const start = performance.now()
      // eslint-disable-next-line no-debugger
      debugger 
      const end = performance.now()
      
      if (end - start > 100) {
        triggerWarning("debugger_detected")
      }
    }

    // console.log honeypot with safer orientation typing
    const checkLogHoneypot = () => {
      if (isWhitelistedPath || isAdmin || allowDeveloperOptions) return
      const devtools = {
        isOpen: false,
        orientation: undefined as string | undefined,
      }
      const threshold = 160
      
      const timer = setInterval(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold
        const heightThreshold = window.outerHeight - window.innerHeight > threshold
        const orientation = widthThreshold ? 'vertical' : 'horizontal'

        // Check for common devtools indicators
        const isFirebug = (window as any).Firebug?.chrome?.isInitialized
        
        if (!(heightThreshold && widthThreshold) && (isFirebug || widthThreshold || heightThreshold)) {
          if (!devtools.isOpen || devtools.orientation !== orientation) {
            triggerWarning("console_accessed")
          }
          devtools.isOpen = true
          devtools.orientation = orientation
        } else {
          devtools.isOpen = false
          devtools.orientation = undefined
        }
      }, 1000)
      return timer
    }

    if (isWhitelistedPath || isAdmin || allowDeveloperOptions) return

    document.addEventListener("contextmenu", prevent)
    document.addEventListener("keydown", preventKey, true)
    window.addEventListener("resize", onResize)

    const debuggerInterval = setInterval(checkDebugger, 2000)
    const logInterval = checkLogHoneypot()

    return () => {
      document.removeEventListener("contextmenu", prevent)
      document.removeEventListener("keydown", preventKey, true)
      window.removeEventListener("resize", onResize)
      clearInterval(debuggerInterval)
      if (logInterval) clearInterval(logInterval)
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    }
  }, [triggerWarning, isWhitelistedPath, onResize, isAdmin, allowDeveloperOptions])

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 pointer-events-auto backdrop-blur-sm"
        >
          <div className="bg-[#0b0b0b] border border-red-500/50 p-8 rounded-2xl text-center shadow-[0_0_80px_rgba(239,68,68,0.2)] max-w-sm mx-4 relative overflow-hidden">
            {/* Pulsing warning glow */}
            <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />

            <div className="text-5xl mb-4">⚠️</div>
            <div className="text-red-500 font-black tracking-tighter text-2xl mb-2 font-mono uppercase">
              Security Violation
            </div>
            <div className="text-white/70 font-mono text-[10px] uppercase tracking-[0.2em] mb-6 leading-relaxed">
              Debugger detected.<br />
              IP Address logged.<br />
              <span className="text-red-400 font-bold">Block sequence initiated...</span>
            </div>

            <div className="space-y-4">
              <div className="h-1.5 w-full bg-red-500/10 rounded-full overflow-hidden border border-red-500/20">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="h-full bg-red-600 shadow-[0_0_10px_red]"
                />
              </div>
              <p className="text-[9px] text-red-500/50 font-bold uppercase animate-pulse">
                System will lock in <span className="text-white">10 seconds</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

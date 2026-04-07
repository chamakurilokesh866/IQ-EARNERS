import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { useNotificationsOptional, IMPORTANT_NOTIFICATION_TYPES } from "@/context/NotificationContext"
import { motion, AnimatePresence } from "framer-motion"

const BELL_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

export default function NotificationBell() {
  const ctx = useNotificationsOptional()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target)) return
      // If clicking the bell button, let the click handler handle it
      const btn = document.getElementById('bell-button')
      if (btn?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    return () => document.removeEventListener("mousedown", onOutside)
  }, [open])

  const important = useMemo(
    () => ctx?.notifications.filter((n) => n.type && IMPORTANT_NOTIFICATION_TYPES.includes(n.type)) ?? [],
    [ctx?.notifications]
  )
  const unreadImportant = important.filter((n) => !n.read).length

  if (!ctx || !mounted) return null

  const { markAllRead, markOneRead, clearAll } = ctx

  const drawer = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Drawer Panel */}
          <motion.div
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-[400px] h-full bg-[#020617] border-l border-white/10 shadow-[-10px_0_40px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <div className="px-6 py-8 border-b border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    {BELL_SVG}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Inbox</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">Platform Alerts</p>
                  </div>
                </div>
                <button 
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                 <button 
                   onClick={clearAll}
                   className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50"
                 >
                   Clear All
                 </button>
                 <button 
                   onClick={markAllRead}
                   className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
                 >
                   Mark as Read
                 </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 thin-scrollbar">
              {important.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-10">
                    <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-2xl mb-4 grayscale opacity-50">✨</div>
                    <p className="text-white/60 font-medium">All caught up!</p>
                    <p className="text-[11px] text-white/30 mt-1">Check back later for tournaments and challenges.</p>
                </div>
              ) : (
                important.map((n) => (
                  <div
                    key={n.id}
                    role={n.actionHref ? "button" : undefined}
                    tabIndex={n.actionHref ? 0 : undefined}
                    onClick={() => {
                      if (!n.actionHref) return
                      markOneRead(n.id)
                      router.push(n.actionHref)
                      setOpen(false)
                    }}
                    onKeyDown={(e) => {
                      if (!n.actionHref) return
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        markOneRead(n.id)
                        router.push(n.actionHref)
                        setOpen(false)
                      }
                    }}
                    className={`group relative rounded-2xl p-4 transition-all duration-300 border ${
                        n.read 
                        ? "bg-white/[0.01] border-white/5 text-white/50" 
                        : "bg-white/[0.05] border-white/10 text-white/90 shadow-sm"
                    } hover:border-primary/30 ${n.actionHref ? "cursor-pointer hover:bg-white/[0.07]" : ""}`}
                  >
                    {!n.read && <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.6)]" />}
                    <div className="flex gap-4">
                       <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border ${
                           n.type === 'win' ? "bg-amber-400/10 border-amber-400/20 text-amber-100" :
                           n.type === 'challenge' ? "bg-violet-400/10 border-violet-400/20 text-violet-100" :
                           n.type === 'spin' ? "bg-fuchsia-400/10 border-fuchsia-400/20 text-fuchsia-100" :
                           "bg-primary/10 border-primary/20 text-primary-100"
                       }`}>
                           {n.type === 'challenge' ? '⚔️' : n.type === 'win' ? '🏆' : n.type === 'spin' ? '🎡' : '🔔'}
                       </span>
                       <div>
                          <p className="text-sm font-medium leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-white/20 mt-2 block font-mono">
                            {new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                <button 
                  onClick={() => setOpen(false)}
                  className="w-full py-3 rounded-2xl bg-white border border-white/10 text-black font-bold text-sm hover:bg-white/90 transition-all active:scale-[0.98]"
                >
                  Close Panel
                </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <div className="relative shrink-0">
        <button
          id="bell-button"
          type="button"
          onClick={() => setOpen(true)}
          className="relative group p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all active:scale-90"
          aria-label={unreadImportant > 0 ? `${unreadImportant} notifications` : "Notifications"}
        >
          {BELL_SVG}
          {unreadImportant > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-black text-[10px] font-black px-1.5 shadow-[0_0_12px_rgba(124,58,237,0.6)] animate-in zoom-in duration-300">
              {unreadImportant > 99 ? "99+" : unreadImportant}
            </span>
          )}
        </button>
      </div>
      {typeof document !== "undefined" && createPortal(drawer, document.body)}
    </>
  )
}

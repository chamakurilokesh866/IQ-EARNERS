"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export type ToastType = "error" | "success" | "info"

export type Toast = {
  id: string
  message: string
  type: ToastType
}

type ToastState = {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  dismissToast: (id: string) => void
}

const Ctx = createContext<ToastState | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismissToast(id), 4000)
  }, [dismissToast])

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast])
  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </Ctx.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && toasts.length > 0) {
        onDismiss(toasts[toasts.length - 1].id)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toasts, onDismiss])

  if (toasts.length === 0) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          tabIndex={0}
          role="button"
          onClick={() => onDismiss(t.id)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onDismiss(t.id))}
          className={`cursor-pointer rounded-lg px-4 py-3 shadow-lg border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-black ${
            t.type === "error"
              ? "bg-red-900/90 border-red-500/50 text-red-50"
              : t.type === "success"
                ? "bg-green-900/90 border-green-500/50 text-green-50"
                : "bg-navy-700/90 border-white/20 text-white"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const v = useContext(Ctx)
  if (!v) throw new Error("ToastProvider not found")
  return v
}

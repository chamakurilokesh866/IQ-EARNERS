"use client"

import { useEffect } from "react"
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate"

export default function Page() {
  const { navigate } = useTransitionNavigate()
  useEffect(() => {
    navigate("/home", { replace: true })
  }, [navigate])
  return (
    <main className="flex min-h-screen items-center justify-center app-page-surface">
      <div className="text-white/70 animate-pulse">Redirecting…</div>
    </main>
  )
}

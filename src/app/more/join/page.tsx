"use client"

import { useEffect } from "react"
import { performLogout } from "@/lib/logout"

export default function Page() {
  useEffect(() => {
    performLogout()
  }, [])
  return (
    <main className="flex min-h-screen items-center justify-center app-page-surface">
      <div className="card p-6 text-center">
        <p className="text-navy-300">Logging out and redirecting to login…</p>
        <div className="mt-4 h-2 w-48 mx-auto rounded-full bg-navy-700 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </main>
  )
}

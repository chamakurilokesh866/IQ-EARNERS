"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import TransitionLink from "../../components/TransitionLink"
import { performLogout } from "@/lib/logout"
import InspectBlockedGate from "@/components/InspectBlockedGate"

function clearBlockedCookies() {
  if (typeof document === "undefined") return
    ;["blocked", "blocked_username"].forEach((c) => {
      document.cookie = `${c}=; path=/; max-age=0`
    })
}

export default function BlockedPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const usernameFromUrl = searchParams.get("username")?.trim() ?? ""
  const [username, setUsername] = useState(usernameFromUrl)
  const [isIpBlocked, setIsIpBlocked] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if this is an IP block (Inspect detection)
    fetch("/api/security/check-blocked", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(j => setIsIpBlocked(j ? !!j.blocked : false))
      .catch(() => setIsIpBlocked(false))

    if (usernameFromUrl) {
      setUsername(usernameFromUrl)
      return
    }
    if (typeof document === "undefined") return
    const match = document.cookie.match(/blocked_username=([^;]*)/)
    if (match?.[1]) {
      try {
        setUsername(decodeURIComponent(match[1].trim()))
      } catch { }
    }
  }, [usernameFromUrl])

  const handlePay = () => {
    if (username) router.push(`/unblock?username=${encodeURIComponent(username)}`)
  }

  const handleLogout = () => {
    clearBlockedCookies()
    performLogout()
  }

  if (isIpBlocked === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black/75 p-4 backdrop-blur-md">
        <div className="w-10 h-10 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin mb-4" />
        <div className="text-[10px] text-red-900 font-mono uppercase tracking-[0.2em]">Verifying Security Status...</div>
      </main>
    )
  }

  // If it's an IP block, show the hacker gate
  if (isIpBlocked === true) {
    return <InspectBlockedGate />
  }

  // Fallback to standard account block UI if not an IP block
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black/75 px-4 py-12 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border-2 border-amber-500/30 bg-navy-900 p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.1)]">
        <div className="text-5xl mb-4">⚠️</div>
        <div className="text-2xl font-bold text-amber-400 uppercase tracking-tighter">Access Restricted</div>
        <p className="mt-3 text-navy-300">
          Your account {username ? `@${username}` : "associated with this session"} has been suspended.
        </p>
        <p className="mt-2 text-sm text-navy-400">
          Manual administrative review is required. A verification fee of ₹50 applies.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handlePay}
            className="w-full rounded-xl bg-amber-500 px-6 py-4 font-black text-black hover:bg-amber-400 transition-all uppercase tracking-widest text-sm"
          >
            Pay & Appeal
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl bg-navy-800 px-6 py-3 font-medium text-navy-300 hover:bg-navy-700 transition-colors uppercase text-xs tracking-widest"
          >
            Identity Reset (Logout)
          </button>
        </div>
        <div className="mt-6 pt-4 border-t border-navy-800">
          <TransitionLink href="/intro" className="text-xs text-navy-500 hover:text-amber-400 uppercase tracking-widest">
            System Retry
          </TransitionLink>
        </div>
      </div>
    </main>
  )
}

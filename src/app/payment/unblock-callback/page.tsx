"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

function clearBlockedCookies() {
  if (typeof document === "undefined") return
  ;["blocked", "blocked_username"].forEach((c) => {
    document.cookie = `${c}=; path=/; max-age=0`
  })
}

export default function UnblockCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const orderId =
      searchParams.get("order_id") ||
      searchParams.get("orderId") ||
      searchParams.get("cf_order_id") ||
      searchParams.get("reference_id")
    const usernameParam = searchParams.get("username")

    if (!orderId || orderId === "{order_id}" || orderId.startsWith("$")) {
      setStatus("failed")
      return
    }

    const verify = async () => {
      try {
        const url = `/api/payments/unblock/verify?orderId=${encodeURIComponent(orderId)}${usernameParam ? `&username=${encodeURIComponent(usernameParam)}` : ""}`
        const res = await fetch(url, { cache: "no-store", credentials: "include" })
        const data = await res.json().catch(() => ({}))

        if (data.ok && data.status === "success") {
          setUsername(data.username || usernameParam || null)
          clearBlockedCookies()
          setStatus("success")
          setTimeout(() => window.location.replace("/intro?msg=unblocked"), 3000)
          return
        }
        setStatus("failed")
      } catch {
        setStatus("failed")
      }
    }

    verify()
  }, [searchParams])

  if (status === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center app-page-surface p-4">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="inline-flex h-12 w-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-navy-300">Verifying your payment…</p>
        </div>
      </main>
    )
  }

  if (status === "failed") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center app-page-surface p-4">
        <div className="card p-8 max-w-md w-full text-center border-2 border-red-500/30">
          <div className="text-4xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-red-400">Payment verification failed</h1>
          <p className="mt-2 text-sm text-navy-300">Please contact support if you completed the payment.</p>
          <a href="/intro" className="mt-6 inline-block pill bg-primary text-black px-6 py-3 font-semibold">
            Back to home
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center app-page-surface p-4">
      <div className="card p-8 max-w-md w-full text-center border-2 border-emerald-500/50 animate-pop">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-emerald-400">Account Unblocked!</h1>
        <p className="mt-3 text-navy-300">
          Your payment was successful. {username ? `@${username} has been unblocked.` : "Your account has been unblocked."}
        </p>
        <p className="mt-2 text-sm text-navy-400">You can now log in and continue.</p>
        <p className="mt-4 text-xs text-navy-500">Redirecting to login in 3 seconds…</p>
        <a href="/intro?msg=unblocked" className="mt-6 inline-block pill bg-primary text-black px-6 py-3 font-semibold">
          Go to Login
        </a>
      </div>
    </main>
  )
}

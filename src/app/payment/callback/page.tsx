"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import MoneyTransferAnimation from "@/components/MoneyTransferAnimation"
import PaymentFailedAnimation from "@/components/PaymentFailedAnimation"

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "failed">("loading")

  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.search.includes("redirected=1")) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set("redirected", "1")
      window.history.replaceState(null, "", "/intro")
      window.history.pushState(null, "", currentUrl.toString())
    }

    const handlePopState = () => {
      window.location.replace("/intro")
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    const qs = typeof window !== "undefined" ? window.location.search : ""
    const fromWindow = qs ? new URLSearchParams(qs) : null
    const orderId =
      searchParams.get("order_id") ||
      searchParams.get("orderId") ||
      searchParams.get("cf_order_id") ||
      searchParams.get("reference_id") ||
      searchParams.get("orderid") ||
      fromWindow?.get("order_id") ||
      fromWindow?.get("orderId") ||
      ""
    const tid = searchParams.get("tournamentId") || fromWindow?.get("tournamentId") || null
    const isPlaceholder =
      !orderId || orderId === "{order_id}" || orderId === "{orderId}" || orderId.startsWith("$") || orderId.length < 3
    if (isPlaceholder) {
      setStatus("failed")
      return
    }

    const checkStatus = async () => {
      try {
        const verifyUrl = tid
          ? `/api/payments/cashfree/verify-order?orderId=${encodeURIComponent(orderId)}&tournamentId=${encodeURIComponent(tid)}`
          : `/api/payments/cashfree/verify-order?orderId=${encodeURIComponent(orderId)}`
        let res = await fetch(verifyUrl, { cache: "no-store", credentials: "include" })
        let data = await res.json().catch(() => ({}))
        if (!data.ok || data.status !== "success") {
          res = await fetch(`/api/payments/cashfree/status?orderId=${encodeURIComponent(orderId)}`, {
            cache: "no-store",
            credentials: "include"
          })
          data = await res.json().catch(() => ({}))
          if (!data.ok && res.status === 404) {
            res = await fetch(verifyUrl, { cache: "no-store", credentials: "include" })
            data = await res.json().catch(() => ({}))
          }
        }
        if (data?.ok && data.status === "success") {
          const tokenRes = await fetch("/api/payment/create-username-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ orderId })
          })
          const tokenData = await tokenRes.json().catch(() => ({}))
          if (tokenData?.ok && tokenData?.token) {
            const url = new URL("/create-username", window.location.origin)
            url.searchParams.set("token", tokenData.token)
            if (tid) url.searchParams.set("tournamentId", tid)
            window.location.replace(url.toString())
            return
          }
        }
        setStatus("failed")
      } catch {
        setStatus("failed")
      }
    }

    checkStatus()
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center p-4 app-page-surface">
      <div className="glass-card purple-panel p-8 max-w-md w-full text-center relative overflow-hidden">
        <div className="absolute inset-0 holo-grid-bg opacity-10 pointer-events-none" />

        {status === "loading" && (
          <MoneyTransferAnimation message="Verifying payment and connecting to server…" />
        )}

        {status === "failed" && (
          <PaymentFailedAnimation autoRedirectSeconds={4} redirectTo="/intro?openPay=1" />
        )}
      </div>
    </div>
  )
}

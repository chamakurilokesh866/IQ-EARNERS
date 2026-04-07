"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    cashfree?: {
      checkout: (options: {
        paymentSessionId: string
        returnUrl: string
      }) => void
    }
  }
}

export default function CashfreeCheckout({
  paymentSessionId,
  appId,
  orderAmount,
  orderCurrency,
  onSuccess,
  onFailure
}: {
  paymentSessionId: string
  appId: string
  orderAmount: number
  orderCurrency: string
  onSuccess?: () => void
  onFailure?: (error: string) => void
}) {
  const scriptLoaded = useRef(false)

  useEffect(() => {
    if (!paymentSessionId || !appId) return

    const loadCashfreeSDK = () => {
      if (scriptLoaded.current) {
        initCheckout()
        return
      }

      const script = document.createElement("script")
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js"
      script.async = true
      script.onload = () => {
        scriptLoaded.current = true
        initCheckout()
      }
      script.onerror = () => {
        onFailure?.("Failed to load Cashfree SDK")
      }
      document.body.appendChild(script)
    }

    const initCheckout = () => {
      if (!window.cashfree) {
        onFailure?.("Cashfree SDK not loaded")
        return
      }

      try {
        window.cashfree.checkout({
          paymentSessionId,
          returnUrl: `${window.location.origin}/payment/callback?order_id={order_id}`
        })
      } catch (error: any) {
        onFailure?.(error.message || "Failed to initialize checkout")
      }
    }

    loadCashfreeSDK()
  }, [paymentSessionId, appId, onSuccess, onFailure])

  return null
}

"use client"

/**
 * Cloudflare Turnstile widget (explicit render for modals).
 * Script loaded early via layout; uses explicit render for modals.
 * Test key (1x00000000000000000000AA) used in development when no site key set.
 *
 * Console messages from Cloudflare's iframe (script-src fallback, PAT challenge, preload warning)
 * are from their domain and cannot be fixed in our code — safe to ignore.
 * Error 600010: config/domain issue — add this domain in Turnstile → Hostname Management.
 */
import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useId, useState } from "react"

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
const TEST_SITE_KEY = "1x00000000000000000000AA"

export type TurnstileWidgetRef = {
  getToken: () => string | null
  reset: () => void
}

type TurnstileWidgetProps = {
  onVerify?: (token: string) => void
  onExpire?: () => void
  onError?: (errorCode?: string) => void
  theme?: "light" | "dark" | "auto"
  size?: "normal" | "compact"
  /** Appearance mode: "always" (default), "execute" (invisible), "interaction-only" (only if challenge required) */
  appearance?: "always" | "execute" | "interaction-only"
  /** Enable debug logging to console when Turnstile loads (development only) */
  debug?: boolean
}

const ERROR_600010 = "600010"
const ERROR_110200 = "110200" // Domain not allowed

function TurnstileWidgetInner(
  { onVerify, onExpire, onError, theme = "auto", size = "normal", appearance = "always", debug = false }: TurnstileWidgetProps,
  ref: React.Ref<TurnstileWidgetRef>
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [widgetError, setWidgetError] = useState<string | null>(null)
  const instanceId = useId().replace(/:/g, "-")
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ??
    (typeof process !== "undefined" && process.env?.NODE_ENV === "development" ? TEST_SITE_KEY : "")

  const getToken = useCallback((): string | null => {
    if (typeof window === "undefined" || !(window as any).turnstile) return null
    const wid = widgetIdRef.current
    if (wid == null) return null
    return (window as any).turnstile.getResponse(wid) ?? null
  }, [])

  const reset = useCallback(() => {
    if (typeof window === "undefined" || !(window as any).turnstile) return
    const wid = widgetIdRef.current
    if (wid != null) {
      try {
        (window as any).turnstile.reset(wid)
      } catch { }
    }
  }, [])

  useImperativeHandle(ref, () => ({ getToken, reset }), [getToken, reset])

  useEffect(() => {
    if (!siteKey) return

    const render = () => {
      const el = containerRef.current
      const turnstile = (window as any).turnstile
      if (!el || !turnstile || widgetIdRef.current != null) return
      try {
        setWidgetError(null)
        const wid = turnstile.render(el, {
          sitekey: siteKey,
          theme,
          size,
          appearance,
          callback: (token: string) => {
            setWidgetError(null)
            onVerify?.(token)
          },
          "expired-callback": () => onExpire?.(),
          "error-callback": (errorCode?: string) => {
            setWidgetError(errorCode ?? ERROR_600010)
            onError?.(errorCode)
          }
        })
        widgetIdRef.current = wid
      } catch { }
    }

    if ((window as any).turnstile) {
      if (debug && typeof console !== "undefined") console.log("[Turnstile] Already loaded")
      render()
      return
    }

    const script = document.createElement("script")
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => {
      if ((window as any).turnstile) {
        if (debug && typeof console !== "undefined") console.log("[Turnstile] Loaded successfully")
        render()
      } else if (debug && typeof console !== "undefined") {
        console.error("[Turnstile] Failed to load")
      }
    }
    document.head.appendChild(script)

    return () => {
      const wid = widgetIdRef.current
      if (wid != null && (window as any).turnstile?.remove) {
        try {
          (window as any).turnstile.remove(wid)
        } catch { }
        widgetIdRef.current = null
      }
    }
  }, [siteKey, theme, size, onVerify, onExpire, onError])

  if (!siteKey) return null

  const errorMessage =
    widgetError === ERROR_110200
      ? "This domain is not allowed. Add it in Cloudflare Turnstile → Widget → Hostname Management."
      : widgetError === ERROR_600010
        ? "Verification could not load. Add this domain in Cloudflare Turnstile → Hostname Management, or try without dev tools open."
        : widgetError
          ? "Verification failed. Try again or add this domain in Turnstile settings."
          : null

  return (
    <div className="min-h-[65px] w-full flex flex-col items-center justify-center p-1" aria-label="Verification">
      <div ref={containerRef} id={`turnstile-${instanceId}`} />
      {errorMessage && (
        <p className="text-xs text-amber-400/90 mt-2 text-center max-w-[280px]">{errorMessage}</p>
      )}
    </div>
  )
}

const TurnstileWidget = forwardRef(TurnstileWidgetInner)
TurnstileWidget.displayName = "TurnstileWidget"
export default TurnstileWidget

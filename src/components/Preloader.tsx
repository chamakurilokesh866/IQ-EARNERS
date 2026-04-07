"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import logoPng from "../app/prizes/icon.png"

const MAX_SHOW_MS = 8000
/** At least this long so the overlay reads as intentional (not a flash). */
const MIN_VISIBLE_MS = 550
const SKIP_SHOW_MS = 2800
const SLOW_CONN_MS = 2000

export default function Preloader() {
  const [show, setShow] = useState(true)
  const [showSkip, setShowSkip] = useState(false)
  const [isSlow, setIsSlow] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let cancelled = false
    let finished = false
    const started = typeof performance !== "undefined" ? performance.now() : Date.now()

    const skipT = window.setTimeout(() => setShowSkip(true), SKIP_SHOW_MS)
    const slowT = window.setTimeout(() => setIsSlow(true), SLOW_CONN_MS)
    const maxT = window.setTimeout(() => finish(), MAX_SHOW_MS)

    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection
    if (
      conn &&
      (conn.saveData ||
        (conn.effectiveType && ["slow-2g", "2g", "3g"].includes(conn.effectiveType)))
    ) {
      setIsSlow(true)
    }

    function finish() {
      if (cancelled || finished) return
      finished = true
      window.clearTimeout(maxT)
      const now = typeof performance !== "undefined" ? performance.now() : Date.now()
      const elapsed = now - started
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
      window.setTimeout(() => {
        if (cancelled) return
        setExiting(true)
        window.setTimeout(() => {
          if (!cancelled) setShow(false)
        }, 480)
      }, remaining)
    }

    if (document.readyState === "complete") {
      finish()
    } else {
      window.addEventListener("load", finish, { once: true })
    }

    return () => {
      cancelled = true
      window.clearTimeout(skipT)
      window.clearTimeout(slowT)
      window.clearTimeout(maxT)
      window.removeEventListener("load", finish)
    }
  }, [])

  useEffect(() => {
    if (!show) return
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [show])

  if (!show) return null

  return (
    <div
      id="app-preloader"
      className={`app-preloader-root ${exiting ? "app-preloader-root--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading application"
    >
      <div className="app-preloader-inner">
        <div className="app-preloader-glow" aria-hidden />

        <div className="app-preloader-logo-wrap">
          <div className="app-preloader-spinner" aria-hidden />
          <div className="app-preloader-logo-inner">
            <Image
              src={logoPng}
              alt=""
              width={128}
              height={128}
              className="animate-pulse-glow app-preloader-logo-img"
              sizes="128px"
            />
          </div>
        </div>

        <div className="app-preloader-copy">
          <div
            className={`app-preloader-label ${isSlow ? "text-amber-400" : "text-white/40"}`}
          >
            {isSlow ? "Poor connection" : "Initializing"}
          </div>
          <div className="app-preloader-bar-track">
            <div
              className={`app-preloader-bar-fill ${isSlow ? "bg-amber-400" : "bg-primary"}`}
            />
          </div>
          {isSlow ? (
            <div className="app-preloader-slow-hint">Optimizing for your network…</div>
          ) : null}
        </div>

        {(showSkip || isSlow) && (
          <button
            type="button"
            className="app-preloader-skip"
            onClick={() => {
              setExiting(true)
              window.setTimeout(() => setShow(false), 400)
            }}
          >
            {isSlow ? "Enter anyway" : "Skip loading"}
          </button>
        )}
      </div>
    </div>
  )
}

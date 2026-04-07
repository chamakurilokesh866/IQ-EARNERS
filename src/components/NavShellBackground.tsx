"use client"

import { useId } from "react"

/** Same gradient + grid as `LeftSidebar` — use behind nav chrome (relative parent). */
export default function NavShellBackground({ variant = "dark" as "dark" | "light" }) {
  const raw = useId().replace(/:/g, "")
  const pid = `iq-nav-grid-${raw}`
  if (variant === "light") {
    return (
      <>
        <div
          className="absolute inset-0 -z-20 rounded-[inherit] bg-gradient-to-b from-white via-slate-50 to-slate-100"
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 rounded-[inherit] opacity-[0.12] pointer-events-none" aria-hidden>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={pid} width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#64748b" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${pid})`} />
          </svg>
        </div>
      </>
    )
  }
  return (
    <>
      <div
        className="absolute inset-0 -z-20 rounded-[inherit]"
        style={{ background: "linear-gradient(180deg, #0c0c10 0%, #050508 55%, #030306 100%)" }}
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 rounded-[inherit] opacity-[0.08] pointer-events-none" aria-hidden>
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={pid} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${pid})`} />
        </svg>
      </div>
    </>
  )
}

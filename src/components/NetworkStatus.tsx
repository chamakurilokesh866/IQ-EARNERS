"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import logoPng from "../app/prizes/icon.png"

export default function NetworkStatus() {
  const [offline, setOffline] = useState<boolean>(false)
  const [msg, setMsg] = useState<string>("Connection lost")
  useEffect(() => {
    const set = () => setOffline(!(typeof navigator !== "undefined" && navigator.onLine))
    set()
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])
  const retry = async () => {
    setMsg("Retrying…")
    try {
      const c = new AbortController()
      const id = setTimeout(() => c.abort(), 3000)
      const r = await fetch("/api/health", { signal: c.signal, cache: "no-store" })
      clearTimeout(id)
      if (r.ok) {
        setOffline(false)
        setMsg("Connection restored")
        setTimeout(() => setMsg("Connection lost"), 1500)
      } else {
        setMsg("Still offline")
      }
    } catch {
      setMsg("Still offline")
    }
  }
  if (!offline) return null
  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-navy-900/90 backdrop-blur">
      <div className="card p-6 w-80 text-center">
        <div className="mx-auto rounded-full p-2 bg-navy-800 border border-navy-700 w-20 h-20 flex items-center justify-center">
          <Image src={logoPng} alt="IQ Earners" className="h-18 w-18 rounded-full object-contain" />
        </div>
        <div className="mt-3 font-semibold">Network Issue</div>
        <div className="mt-1 text-sm text-navy-300">{msg}</div>
        <div className="mt-4">
          <button className="pill bg-primary" onClick={retry}>Retry</button>
        </div>
      </div>
    </div>
  )
}

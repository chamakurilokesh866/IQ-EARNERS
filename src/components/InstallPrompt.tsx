"use client"

import { useEffect, useState } from "react"

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [visible, setVisible] = useState<boolean>(false)
  useEffect(() => {
    const key = "install_prompt_dismissed"
    const onBeforeInstallPrompt = (e: any) => {
      if (typeof window !== "undefined" && window.localStorage.getItem(key)) return
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
  }, [])
  const install = async () => {
    if (!deferred) return
    const choice = await deferred.prompt()
    setDeferred(null)
    setVisible(false)
  }
  const dismiss = () => {
    try { window.localStorage.setItem("install_prompt_dismissed", "1") } catch {}
    setVisible(false)
  }
  if (!visible) return null
  return (
    <div className="fixed bottom-4 left-4 z-[102]">
      <div className="card p-4 w-72">
        <div className="font-semibold">Install IQ Earners</div>
        <div className="mt-1 text-sm text-navy-300">Get quick access and offline support.</div>
        <div className="mt-3 flex items-center gap-3">
          <button className="pill bg-primary" onClick={install}>Install</button>
          <button className="pill bg-navy-700" onClick={dismiss}>Later</button>
        </div>
      </div>
    </div>
  )
}

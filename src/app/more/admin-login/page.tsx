"use client"

import Navbar from "../../../components/Navbar"
import LoginModal from "../../../components/LoginModal"
import { useEffect, useState } from "react"
import TransitionLink from "../../../components/TransitionLink"
import { motion } from "framer-motion"
import {
  IQ_DEFERRED_INSTALL_EVENT,
  type BeforeInstallPromptEventType,
  isAdminStandalonePwa,
} from "@/lib/adminPwaInstall"

export default function Page() {
  const [showLogin, setShowLogin] = useState(false)
  const [fastUsername, setFastUsername] = useState("")
  const [fastPassword, setFastPassword] = useState("")
  const [fastCode, setFastCode] = useState("")
  const [fastLoading, setFastLoading] = useState(false)
  const [fastError, setFastError] = useState("")
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEventType | null>(null)
  const [isStandaloneInstalled, setIsStandaloneInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    setIsStandaloneInstalled(isAdminStandalonePwa())
    const onInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredInstallPrompt(e as BeforeInstallPromptEventType)
    }
    const onForwardedInstall = (ce: Event) => {
      const detail = (ce as CustomEvent<BeforeInstallPromptEventType>).detail
      if (detail) setDeferredInstallPrompt(detail)
    }
    const onInstalled = () => {
      setIsStandaloneInstalled(true)
      setDeferredInstallPrompt(null)
    }
    window.addEventListener("beforeinstallprompt", onInstallPrompt)
    window.addEventListener(IQ_DEFERRED_INSTALL_EVENT, onForwardedInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt)
      window.removeEventListener(IQ_DEFERRED_INSTALL_EVENT, onForwardedInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const installAdminApp = async () => {
    if (!deferredInstallPrompt) return
    await deferredInstallPrompt.prompt()
    await deferredInstallPrompt.userChoice.catch(() => null)
    setDeferredInstallPrompt(null)
  }

  const submitFastAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fastUsername.trim() || !fastPassword.trim() || fastCode.replace(/\D/g, "").length !== 6) return
    setFastLoading(true)
    setFastError("")
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: fastUsername.trim(),
          password: fastPassword.trim(),
          code: fastCode.replace(/\D/g, "").slice(0, 6),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Admin sign-in failed")
      window.location.replace(json?.redirectTo || "/a/admin")
    } catch (err: any) {
      setFastError(err?.message ?? "Admin sign-in failed")
    } finally {
      setFastLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-100">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="ui-aurora-ring w-full max-w-md"
          >
            <div className="ui-aurora-ring-inner p-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/25 text-lg font-black text-mint mb-4 border border-white/10">
                AD
              </div>
              <div className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Admin Access
              </div>
              <p className="mt-2 text-sm text-navy-300 leading-relaxed">
                Fast login uses admin username, password, and Microsoft Authenticator code in one step.
              </p>
              <form onSubmit={submitFastAdminLogin} className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
                <div className="text-[11px] font-bold uppercase tracking-widest text-mint">Fast Admin Sign-in</div>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                  placeholder="Admin username"
                  value={fastUsername}
                  onChange={(e) => setFastUsername(e.target.value)}
                  autoComplete="username"
                />
                <input
                  type="password"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                  placeholder="Admin password"
                  value={fastPassword}
                  onChange={(e) => setFastPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <input
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm tracking-[0.25em] text-white outline-none focus:border-primary/50"
                  placeholder="Authenticator code"
                  value={fastCode}
                  onChange={(e) => setFastCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                {fastError ? <p className="text-xs text-red-300">{fastError}</p> : null}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-mint px-4 py-2.5 text-sm font-bold text-black hover:brightness-110 disabled:opacity-60"
                  disabled={fastLoading || !fastUsername.trim() || !fastPassword.trim() || fastCode.length !== 6}
                >
                  {fastLoading ? "Verifying..." : "Instant Login (Microsoft Authenticator)"}
                </button>
              </form>
              <p className="mt-2 text-[11px] text-white/45 leading-relaxed">
                On mobile, open this page and use your browser&apos;s <span className="text-mint font-semibold">Add to Home Screen</span> to install the dedicated <span className="text-mint font-semibold">IQ Admin</span> app.
              </p>
              <button
                type="button"
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-3.5 font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110 transition-all active:scale-[0.98]"
                onClick={() => setShowLogin(true)}
              >
                Log in with Admin Username
              </button>
              {!isStandaloneInstalled && deferredInstallPrompt ? (
                <button
                  type="button"
                  className="mt-3 w-full rounded-2xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm font-bold text-mint hover:bg-primary/15 transition-all"
                  onClick={() => { void installAdminApp() }}
                >
                  Install IQ Admin App
                </button>
              ) : !isStandaloneInstalled ? (
                <p className="mt-3 text-[11px] text-white/50 text-center leading-relaxed">
                  Use your browser menu to add this page to your home screen if you don&apos;t see an install button.
                </p>
              ) : null}
              <TransitionLink
                href="/intro"
                className="mt-4 inline-block text-sm text-accent/90 hover:text-mint transition-colors"
              >
                ← Back to Intro
              </TransitionLink>
            </div>
          </motion.div>
        </div>
      </section>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  )
}

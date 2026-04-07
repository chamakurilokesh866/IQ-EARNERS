"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

type OrgInfo = { name: string; slug: string; type: string; logo?: string; tagline?: string; primaryColor: string; accentColor: string; suspended: boolean }

export default function OrgLoginPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/org/${slug}/info`).then((r) => r.json()).then((j) => {
      if (j.ok) setOrg(j.data)
      else setOrg(null)
    }).catch(() => setOrg(null)).finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    fetch(`/api/org/${slug}/auth`, { credentials: "include" }).then((r) => r.json()).then((j) => {
      if (j.loggedIn) {
        router.replace(j.role === "owner" || j.role === "admin" ? `/org/${slug}/dashboard` : `/org/${slug}`)
      }
    }).catch(() => {})
  }, [slug, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) { setError("Enter username and password"); return }
    setSubmitting(true); setError("")
    try {
      const res = await fetch(`/api/org/${slug}/auth`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      })
      const j = await res.json()
      if (j.ok) {
        router.replace(j.role === "owner" || j.role === "admin" ? `/org/${slug}/dashboard` : `/org/${slug}`)
      } else {
        setError(j.error || "Login failed")
      }
    } catch { setError("Network error") }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen app-page-surface flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen app-page-surface flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-6xl">🏛</div>
        <h1 className="text-2xl font-black text-white">Organization Not Found</h1>
        <p className="text-white/50 text-sm max-w-md">
          The organization <span className="text-cyan-400 font-bold">{slug}</span> does not exist or has been removed.
        </p>
        <a href="/intro" className="mt-4 text-cyan-400 text-sm font-bold hover:underline">Go to IQ Earners main site</a>
      </div>
    )
  }

  if (org.suspended) {
    return (
      <div className="min-h-screen app-page-surface flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-6xl">⚠</div>
        <h1 className="text-xl font-black text-amber-400">{org.name} is Suspended</h1>
        <p className="text-white/50 text-sm">Please contact the platform administrator.</p>
      </div>
    )
  }

  const pc = org.primaryColor || "#7c3aed"

  return (
    <div className="min-h-screen app-page-surface flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-[0.08]" style={{ background: pc }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-[0.06]" style={{ background: org.accentColor }} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-8">
            {org.logo ? (
              <img src={org.logo} alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover border border-white/10" />
            ) : (
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black text-white border border-white/10" style={{ background: `${pc}30` }}>
                {org.name.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-black text-white tracking-tight">{org.name}</h1>
            {org.tagline && <p className="text-sm text-white/40 mt-1">{org.tagline}</p>}
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1 text-[10px] font-bold text-white/50 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: pc }} /> {org.type}
            </div>
          </div>

          <form onSubmit={handleLogin} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-lg font-black text-white mb-1">Sign in</h2>
            <p className="text-xs text-white/40 mb-6">Members and administrators</p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5 block">Username or Email</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" autoComplete="username" className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:border-transparent transition-all" style={{ "--tw-ring-color": `${pc}50` } as React.CSSProperties} placeholder="Enter your username or email" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5 block">Password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:border-transparent transition-all" style={{ "--tw-ring-color": `${pc}50` } as React.CSSProperties} placeholder="Enter your password" />
              </div>
            </div>

            {error && <p className="mt-3 text-red-400 text-xs font-bold">{error}</p>}

            <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl py-3.5 text-sm font-black text-white transition-all hover:brightness-110 disabled:opacity-50" style={{ background: pc }}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center mt-8 text-[10px] text-white/25 uppercase tracking-widest font-bold">
            Powered by IQ Earners
          </p>
        </div>
      </div>
    </div>
  )
}

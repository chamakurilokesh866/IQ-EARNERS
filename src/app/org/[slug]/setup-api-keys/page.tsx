"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { orgLoginRedirectPath, rememberOrgPortalCode } from "@/lib/orgPortalClient"

const PERMISSIONS = [
  { key: "quiz:read", label: "Read quizzes" },
  { key: "quiz:write", label: "Create or edit quizzes" },
  { key: "user:read", label: "Read users" },
  { key: "user:write", label: "Manage users" },
  { key: "leaderboard:read", label: "Read leaderboard" },
  { key: "analytics:read", label: "Read analytics" },
  { key: "certificate:read", label: "Read certificates" },
  { key: "certificate:write", label: "Issue certificates" },
  { key: "tournament:read", label: "Read tournaments" },
  { key: "tournament:write", label: "Manage tournaments" },
] as const

export default function OrgApiSetupPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [name, setName] = useState("Production Integration")
  const [rateLimit, setRateLimit] = useState(300)
  const [permissions, setPermissions] = useState<string[]>(["quiz:read", "analytics:read"])
  const [createdKey, setCreatedKey] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const isValid = useMemo(() => Boolean(name.trim()) && permissions.length > 0 && rateLimit >= 1, [name, permissions, rateLimit])

  useEffect(() => {
    Promise.all([
      fetch(`/api/org/${slug}/auth`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/org/${slug}/api-keys`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([auth, keys]) => {
      if (!auth.loggedIn || (auth.role !== "owner" && auth.role !== "admin")) {
        router.replace(orgLoginRedirectPath(String(slug)))
        return
      }
      if (auth.portalCode) rememberOrgPortalCode(String(slug), auth.portalCode)
      if (keys.ok && Array.isArray(keys.data) && keys.data.length > 0) {
        router.replace(`/org/${slug}/dashboard`)
        return
      }
      setReady(true)
    }).catch(() => router.replace(orgLoginRedirectPath(String(slug))))
  }, [slug, router])

  const togglePermission = (permission: string) => {
    setPermissions((prev) => (prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]))
  }

  const createKey = async () => {
    if (!isValid) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/org/${slug}/api-keys`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), permissions, rateLimit }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        setError(json?.error || "Failed to create API key")
        return
      }
      setCreatedKey(json.data.key)
    } catch {
      setError("Network error while creating API key")
    } finally {
      setSaving(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen app-page-surface flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen app-page-surface text-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8">
        <h1 className="text-2xl font-black">Complete organization setup</h1>
        <p className="text-sm text-white/50 mt-2">
          To secure production integrations, create at least one scoped API key for your organization.
        </p>

        {!!createdKey ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              API key created. Copy and store it now. This secret is shown only once.
            </div>
            <div className="rounded-xl bg-black/50 border border-white/10 p-3 font-mono text-xs text-cyan-300 break-all select-all">{createdKey}</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { void navigator.clipboard.writeText(createdKey) }} className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-black text-white">
                Copy key
              </button>
              <button type="button" onClick={() => router.replace(`/org/${slug}/dashboard`)} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-bold text-white/80">
                Continue to dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5 block">Integration name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 block">Required features</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSIONS.map((perm) => (
                  <button
                    key={perm.key}
                    type="button"
                    onClick={() => togglePermission(perm.key)}
                    className={`text-left rounded-lg border px-3 py-2 text-xs transition-all ${permissions.includes(perm.key) ? "border-cyan-500/40 bg-cyan-500/10 text-white" : "border-white/10 bg-black/20 text-white/55 hover:text-white/85"}`}
                  >
                    <span className="font-bold">{perm.label}</span>
                    <span className="block mt-0.5 text-[9px] text-white/35 font-mono">{perm.key}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1.5 block">Rate limit (requests/hour)</label>
              <input
                type="number"
                min={1}
                max={5000}
                value={rateLimit}
                onChange={(e) => setRateLimit(Math.max(1, Math.min(5000, Number(e.target.value) || 1)))}
                className="w-full max-w-xs rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white"
              />
            </div>
            {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
            <button type="button" disabled={!isValid || saving} onClick={() => void createKey()} className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-black text-white disabled:opacity-50">
              {saving ? "Creating secure key..." : "Create production API key"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

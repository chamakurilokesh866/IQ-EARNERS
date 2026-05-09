"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { orgLoginRedirectPath, rememberOrgPortalCode } from "@/lib/orgPortalClient"

export default function OrgChangePasswordPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch(`/api/org/${slug}/auth`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.loggedIn) {
          router.replace(orgLoginRedirectPath(String(slug)))
          return
        }
        if (j.portalCode) rememberOrgPortalCode(String(slug), j.portalCode)
        if (!j.requiresPasswordReset) {
          router.replace(j.role === "owner" || j.role === "admin" ? `/org/${slug}/dashboard` : `/org/${slug}`)
          return
        }
        setReady(true)
      })
      .catch(() => router.replace(orgLoginRedirectPath(String(slug))))
  }, [slug, router])

  const submit = async () => {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/org/${slug}/auth`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.ok) {
        setError(j.error || "Failed to update password")
        return
      }
      router.replace(`/org/${slug}/dashboard`)
    } catch {
      setError("Network error")
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
    <div className="min-h-screen app-page-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
        <h1 className="text-xl font-black text-white">Set a new password</h1>
        <p className="text-xs text-white/50 mt-1">For security, update your temporary password before continuing.</p>
        <div className="mt-5 space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white"
            placeholder="New password (8+ characters)"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white"
            placeholder="Confirm new password"
          />
        </div>
        {error && <p className="mt-3 text-xs font-bold text-red-400">{error}</p>}
        <button type="button" onClick={() => void submit()} disabled={saving} className="mt-5 w-full rounded-xl bg-cyan-500 py-3 text-sm font-black text-white disabled:opacity-50">
          {saving ? "Updating..." : "Update password"}
        </button>
      </div>
    </div>
  )
}

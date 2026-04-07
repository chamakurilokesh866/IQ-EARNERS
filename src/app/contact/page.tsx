"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ContactPage() {
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    fetch("/api/user/profile", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return
        const hasProfile = !!j?.data?.username
        if (hasProfile) {
          router.replace("/user?tab=ContactUs")
        } else {
          router.replace("/intro?msg=contact")
        }
      })
      .catch(() => {
        if (!mounted) return
        router.replace("/intro?msg=contact")
      })
    return () => { mounted = false }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center app-page-surface">
      <div className="text-center text-[#1a2340] font-black uppercase tracking-widest">Redirecting…</div>
    </main>
  )
}

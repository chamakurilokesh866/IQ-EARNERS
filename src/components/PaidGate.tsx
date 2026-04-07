"use client"

import { ReactNode } from "react"
import { useBootstrap } from "@/hooks/useBootstrap"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PaidGate({ children }: { children: ReactNode }) {
  const { data: bootstrap, loaded } = useBootstrap()
  const router = useRouter()
  const paid = bootstrap?.paid ?? null

  useEffect(() => {
    if (loaded && (paid === false || paid === null)) {
      router.replace("/intro?msg=auth-required")
    }
  }, [loaded, paid, router])

  if (!loaded) {
    return (
      <div className="flex min-h-0 flex-col items-center justify-center bg-transparent py-8">
        <div className="h-10 w-10 rounded-full border-2 border-[#7c3aed]/30 border-t-[#7c3aed] animate-spin" />
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Loading…</p>
      </div>
    )
  }

  const resolvedPaid = paid ?? false
  if (resolvedPaid === false) return null

  return <>{children}</>
}

"use client"

import TransitionLink from "./TransitionLink"
import { usePaidStatus } from "@/hooks/usePaidStatus"

export default function UnpaidBanner() {
  const { paid, loading } = usePaidStatus()
  if (loading || paid) return null
  return (
    <div className="sticky top-0 z-[39] bg-primary/10 text-primary px-6 py-2">
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        <div className="text-sm">Kindly participate in a tournament or pay the entry fee to unlock all features.</div>
        <div className="flex items-center gap-2">
          <TransitionLink href="/tournaments" className="pill bg-primary">View Tournament</TransitionLink>
          <TransitionLink href="/intro" className="pill bg-navy-700">Pay Entry Fee</TransitionLink>
        </div>
      </div>
    </div>
  )
}

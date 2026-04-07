"use client"

export default function ReferralStatusBar({ status, isReferrer = true }: { status: "visited" | "pending" | "credited" | string; isReferrer?: boolean }) {
  const pct = status === "credited" ? 100 : status === "pending" ? 66 : status === "visited" ? 33 : 0
  const stepLabel = status === "visited" ? "1. Visited" : status === "pending" ? "2. Joined & Paid" : "3. Credited ✓"
  const rightLabel = status === "credited" ? (isReferrer ? "Referred ₹50 credited" : "₹50 credited") : "Goal: ₹50"
  return (
    <div className="mt-2">
      <div className="relative h-3 w-full rounded-full bg-navy-800 overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full min-w-[4px] rounded-full bg-gradient-to-r from-primary to-success transition-all duration-500 ease-out"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-navy-300">
        <span className="font-medium">{stepLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}

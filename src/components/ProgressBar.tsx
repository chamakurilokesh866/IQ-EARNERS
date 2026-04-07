"use client"

export default function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="h-2 w-full rounded-full bg-[#f1f5f9] border border-[#e2e8f0] overflow-hidden shadow-inner">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out min-w-0"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-label="Progress"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}

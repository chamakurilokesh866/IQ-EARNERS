"use client"

import { useEffect, useState } from "react"

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

export default function Countdown() {
  const [target, setTarget] = useState<number | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    fetch("/api/tournaments", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const t = Array.isArray(j?.data) && j.data.length ? j.data[j.data.length - 1] : null
        if (t?.endTime) {
          const ts = Date.parse(t.endTime)
          if (!Number.isNaN(ts)) setTarget(ts)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!target) {
    return (
      <div>
        <div className="font-semibold mb-3">🏆 Tournament Countdown</div>
        <div className="text-sm text-navy-300">No tournament scheduled</div>
      </div>
    )
  }

  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((diff % (60 * 1000)) / 1000)

  return (
    <div>
      <div className="font-semibold mb-3">🏆 Tournament Ends In</div>
      <div className="grid grid-cols-4 gap-4">
        {[{ label: "Days", value: pad(days) }, { label: "Hours", value: pad(hours) }, { label: "Minutes", value: pad(minutes) }, { label: "Seconds", value: pad(seconds) }].map((t) => (
          <div key={t.label} className="rounded-lg bg-navy-700 p-4 text-center">
            <div className="text-3xl font-bold">{t.value}</div>
            <div className="text-xs text-navy-300">{t.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-success text-sm">• Tournament Active</div>
    </div>
  )
}

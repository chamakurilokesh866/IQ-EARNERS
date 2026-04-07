"use client"
import { useEffect, useState } from "react"

type Rule = { title: string; desc: string; icon?: string }

export default function RulesGrid() {
  const [rules, setRules] = useState<Rule[]>([])
  useEffect(() => {
    fetch("/api/content", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      const rs = Array.isArray(j?.data?.rules) ? j.data.rules : []
      setRules(rs)
    }).catch(() => setRules([]))
  }, [])
  return (
    <section className="card p-6">
      <h2 className="text-xl font-semibold text-center">Tournament Rules</h2>
      <p className="mt-1 text-center text-navy-300">Fair play guidelines for all participants</p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {rules.length ? rules.map((r) => (
          <div key={r.title} className="rounded-lg bg-navy-700 p-4">
            <div className="text-2xl">{r.icon ?? "📘"}</div>
            <div className="mt-2 font-medium">{r.title}</div>
            <div className="text-sm text-navy-300">{r.desc}</div>
          </div>
        )) : (
          <div className="rounded-lg bg-navy-700 p-4 text-sm text-navy-300">No rules configured</div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-success">
        <span>Anti-Cheat Protected</span>
        <span>Live Monitoring</span>
        <span>Verified Winners</span>
      </div>
    </section>
  )
}

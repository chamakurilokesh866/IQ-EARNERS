export type TimeseriesRow = { date: string; score: number; accuracy: number; rank: number }
export function generateTimeseries(days: number): TimeseriesRow[] {
  const rows: TimeseriesRow[] = []
  const now = new Date()
  let score = 75
  let acc = 85
  let rank = 30
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    score = Math.max(50, Math.min(100, score + (Math.random() * 10 - 5)))
    acc = Math.max(60, Math.min(100, acc + (Math.random() * 8 - 4)))
    rank = Math.max(1, Math.min(100, rank + Math.floor(Math.random() * 7 - 3)))
    rows.push({
      date: d.toISOString().slice(0, 10),
      score: Math.round(score),
      accuracy: Math.round(acc),
      rank
    })
  }
  return rows
}

export function toCSV<T extends Record<string, unknown>>(rows: T[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    if (s.includes(",") || s.includes("\n") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(",")]
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(","))
  }
  return lines.join("\n")
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export type AlertItem = {
  id: string
  severity: "info" | "warning" | "critical"
  title: string
  desc: string
  time: string
  status: "open" | "resolved"
}

export function seedAlerts(): AlertItem[] {
  return [
    { id: "a1", severity: "critical", title: "Fraud Detection Spike", desc: "Multiple suspicious attempts in last hour", time: "2 min ago", status: "open" },
    { id: "a2", severity: "warning", title: "Payout Delay", desc: "Gateway latency above threshold", time: "15 min ago", status: "open" },
    { id: "a3", severity: "info", title: "New Tournament Created", desc: "Tech Quiz Championship 2026 published", time: "1 hour ago", status: "resolved" }
  ]
}

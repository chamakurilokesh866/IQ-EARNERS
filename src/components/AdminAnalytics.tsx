"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { downloadCSV, toCSV } from "../utils/admin"

function formatChartDate(s: string) {
  if (!s) return ""
  const d = new Date(s)
  if (isNaN(d.getTime())) return s.slice(5)
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

type RevenuePoint = { date: string; amount: number }
type EnrollPoint = { date: string; count: number }
type CategoryItem = { label: string; count: number }
type FeedbackItem = { id: string; question: string; correctAnswer: string; userAnswer: string; comment?: string; username?: string; createdAt?: number }

/* ─── Smooth SVG Area Chart ─── */
function SmoothAreaChart({
  points,
  label,
  color = "#6366f1",
  gradientId,
  suffix = "",
  dates,
}: {
  points: number[]
  label: string
  color?: string
  gradientId: string
  suffix?: string
  dates?: string[]
}) {
  const W = 700, H = 200, PX = 40, PY = 24
  const max = Math.max(1, ...points)
  const step = points.length > 1 ? (W - PX * 2) / (points.length - 1) : 0
  const pts = points.map((v, i) => ({
    x: PX + i * step,
    y: PY + (H - PY * 2) - (v / max) * (H - PY * 2),
  }))
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  // Build smooth cubic bezier path
  const linePath = useMemo(() => {
    if (pts.length < 2) return ""
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]
      const curr = pts[i]
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`
    }
    return d
  }, [pts])

  const areaPath = linePath
    ? `${linePath} L ${pts[pts.length - 1].x} ${H - PY} L ${pts[0].x} ${H - PY} Z`
    : ""

  // Y-axis labels
  const yLabels = [0, Math.round(max * 0.5), max]

  const total = points.reduce((a, b) => a + b, 0)
  const isEmpty = points.length === 0 || (points.length === 1 && points[0] === 0)

  return (
    <div className="admin-card p-5 hover:border-white/15 transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-white/90">{label}</div>
          <div className="text-xs text-navy-400 mt-0.5">
            {isEmpty ? "No data for this period" : `Total: ${suffix}${total.toLocaleString()}`}
          </div>
        </div>
        {!isEmpty && <span className="pill bg-white/5 border border-white/10 text-xs text-white/60">{points.length} days</span>}
      </div>
      {isEmpty ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-navy-400 rounded-lg bg-white/[0.02] border border-dashed border-white/10">
          No data to display
        </div>
      ) : (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-h-[220px]"
        style={{ overflow: "visible" }}
        onMouseLeave={() => setHoverIdx(null)}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {yLabels.map((v, i) => {
          const y = PY + (H - PY * 2) - (v / max) * (H - PY * 2)
          return (
            <g key={i}>
              <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
              <text x={PX - 6} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="10">
                {suffix}{v.toLocaleString()}
              </text>
            </g>
          )
        })}
        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {/* Line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        )}
        {/* Interactive dots */}
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoverIdx(i)}>
            <rect x={p.x - step / 2} y={PY} width={step || 20} height={H - PY * 2} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill={hoverIdx === i ? "#fff" : color}
              stroke={color}
              strokeWidth={hoverIdx === i ? 2 : 0}
              style={{ transition: "all 0.15s ease" }}
            />
          </g>
        ))}
        {/* Tooltip */}
        {hoverIdx !== null && pts[hoverIdx] && (
          <g>
            <line x1={pts[hoverIdx].x} y1={PY} x2={pts[hoverIdx].x} y2={H - PY} stroke={color} strokeOpacity={0.3} strokeDasharray="3 3" />
            <rect x={pts[hoverIdx].x - 44} y={pts[hoverIdx].y - 36} width={88} height={28} rx={6} fill="rgba(0,0,0,0.85)" stroke={color} strokeWidth={1} />
            <text x={pts[hoverIdx].x} y={pts[hoverIdx].y - 18} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600">
              {suffix}{points[hoverIdx]?.toLocaleString()}
            </text>
            {dates?.[hoverIdx] && (
              <text x={pts[hoverIdx].x} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                {formatChartDate(dates[hoverIdx])}
              </text>
            )}
          </g>
        )}
        {/* X-axis date labels */}
        {dates && dates.length > 0 && [0, Math.floor(dates.length / 2), dates.length - 1].map((idx) => (
          <text key={idx} x={pts[idx]?.x ?? 0} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
            {formatChartDate(dates[idx] ?? "")}
          </text>
        ))}
      </svg>
      )}
    </div>
  )
}

/* ─── Animated Bar Chart ─── */
function AnimatedBarChart({
  values,
  labels,
  label,
  color = "#22d3ee",
}: {
  values: number[]
  labels: string[]
  label: string
  color?: string
}) {
  const max = Math.max(1, ...values)
  const [animated, setAnimated] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])
  const isEmpty = values.length === 0 || values.every((v) => v === 0)

  return (
    <div className="admin-card p-5">
      <div className="text-sm font-semibold text-white/90 mb-4">{label}</div>
      {isEmpty ? (
        <div className="h-40 flex items-center justify-center text-sm text-navy-400 rounded-lg bg-white/[0.02] border border-dashed border-white/10">
          No data for this period
        </div>
      ) : (
        <>
          <div className="flex items-end gap-[3px] h-40" onMouseLeave={() => setHoverIdx(null)}>
            {values.map((v, i) => {
              const pct = (v / max) * 100
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  onMouseEnter={() => setHoverIdx(i)}
                >
                  <div className={`absolute -top-8 left-1/2 -translate-x-1/2 transition-opacity bg-navy-800 border border-white/10 text-white text-[10px] px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap ${hoverIdx === i ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                    <span className="font-semibold text-white">{v.toLocaleString()}</span>
                    <span className="text-navy-400 ml-1">· {formatChartDate(labels[i] ?? "")}</span>
                  </div>
                  <div
                    className="w-full rounded-t transition-all duration-700 ease-out"
                    style={{
                      height: animated ? `${Math.max(4, pct)}%` : "4%",
                      background: hoverIdx === i ? color : `linear-gradient(to top, ${color}40, ${color})`,
                      minWidth: 4,
                      opacity: hoverIdx !== null && hoverIdx !== i ? 0.5 : 1,
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-navy-400">
            <span>{formatChartDate(labels[0] ?? "")}</span>
            <span>{formatChartDate(labels[labels.length - 1] ?? "")}</span>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Interactive Donut Chart ─── */
function DonutChart({ data }: { data: CategoryItem[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0) || 1
  const isEmpty = data.length === 0
  const radius = 70, innerR = 42, cx = 90, cy = 90
  const colors = ["#6366f1", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#f97316", "#14b8a6"]
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  let start = -Math.PI / 2
  const arcs = data.map((d, i) => {
    const angle = (d.count / total) * Math.PI * 2
    const r = hoverIdx === i ? radius + 4 : radius
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const end = start + angle
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const ix1 = cx + innerR * Math.cos(start)
    const iy1 = cy + innerR * Math.sin(start)
    const ix2 = cx + innerR * Math.cos(end)
    const iy2 = cy + innerR * Math.sin(end)
    const largeArc = angle > Math.PI ? 1 : 0
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`
    start = end
    return { path, color: colors[i % colors.length], label: d.label, value: d.count, pct: ((d.count / total) * 100).toFixed(1) }
  })

  return (
    <div className="admin-card p-5">
      <div className="text-sm font-semibold text-white/90 mb-4">Category distribution</div>
      {isEmpty ? (
        <div className="h-44 flex items-center justify-center text-sm text-navy-400 rounded-lg bg-white/[0.02] border border-dashed border-white/10">
          No category data
        </div>
      ) : (
      <div className="flex items-center gap-6 flex-wrap">
        <div className="relative">
          <svg width="180" height="180" viewBox="0 0 180 180">
            {arcs.map((a, i) => (
              <path
                key={i}
                d={a.path}
                fill={a.color}
                opacity={hoverIdx !== null && hoverIdx !== i ? 0.4 : 1}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                style={{ cursor: "pointer", transition: "all 0.2s ease" }}
              />
            ))}
            <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700">
              {total}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">
              questions
            </text>
          </svg>
          {hoverIdx !== null && arcs[hoverIdx] && (
            <div className="absolute top-1/2 left-full ml-2 -translate-y-1/2 bg-black/90 border border-white/10 px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10">
              <div className="font-semibold text-white">{arcs[hoverIdx].label}</div>
              <div className="text-navy-300">{arcs[hoverIdx].value} ({arcs[hoverIdx].pct}%)</div>
            </div>
          )}
        </div>
        <ul className="space-y-1.5 text-sm flex-1 min-w-[140px]">
          {arcs.slice(0, 8).map((a, i) => (
            <li
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-default"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
              <span className="truncate text-white/80">{a.label}</span>
              <span className="ml-auto text-navy-400 text-xs">{a.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
      )}
    </div>
  )
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, icon, trend, sparkValues }: { label: string; value: string | number; icon: string; trend?: string; sparkValues?: number[] }) {
  return (
    <div className="admin-card p-4 flex items-start gap-3 hover:border-white/15 transition-all group overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 border border-white/10 text-xl shrink-0 group-hover:border-white/20">
        {icon}
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-navy-400 font-medium">{label}</div>
        <div className="text-lg sm:text-xl font-bold text-white mt-0.5 tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</div>
        {trend && <div className="text-[10px] text-emerald-400 mt-0.5">{trend}</div>}
        {sparkValues && sparkValues.length > 1 && (
          <div className="mt-2 opacity-80">
            <Sparkline values={sparkValues} color="rgba(255,255,255,0.5)" />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Sparkline ─── */
function Sparkline({ values, color = "#6366f1" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const max = Math.max(1, ...values)
  const W = 80, H = 24
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H}`).join(" ")
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Admin Radar Chart ─── */
function AdminRadarChart({ data }: { data: CategoryItem[] }) {
  if (data.length === 0) return (
    <div className="admin-card p-5 h-64 flex items-center justify-center text-sm text-navy-400">
      Not enough category data
    </div>
  )
  const size = 260
  const center = size / 2
  const maxRadius = 90
  const sides = data.length
  const angleStep = (Math.PI * 2) / sides

  const maxVal = Math.max(1, ...data.map(d => d.count))
  const getPoint = (value: number, idx: number) => {
    const r = (value / maxVal) * maxRadius
    const a = idx * angleStep - Math.PI / 2
    return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`
  }

  const pathData = data.map((d, i) => getPoint(d.count, i)).join(" ")
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

  return (
    <div className="admin-card p-5">
      <div className="text-sm font-semibold text-white/90 mb-2">Category Activity Map</div>
      <div className="flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {gridLevels.map(level => {
            const r = level * maxRadius
            const points = data.map((_, i) => {
              const a = i * angleStep - Math.PI / 2
              return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`
            }).join(" ")
            return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.05)" />
          })}
          {data.map((d, i) => {
            const a = i * angleStep - Math.PI / 2
            const endX = center + maxRadius * Math.cos(a)
            const endY = center + maxRadius * Math.sin(a)
            const textX = center + (maxRadius + 22) * Math.cos(a)
            const textY = center + (maxRadius + 14) * Math.sin(a)
            return (
              <g key={d.label}>
                <line x1={center} y1={center} x2={endX} y2={endY} stroke="rgba(255,255,255,0.05)" />
                <text x={textX} y={textY} textAnchor="middle" alignmentBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontWeight="500">
                  {d.label.length > 12 ? d.label.slice(0, 10) + "…" : d.label}
                </text>
              </g>
            )
          })}
          <polygon points={pathData} fill="rgba(34, 211, 238, 0.2)" stroke="#22d3ee" strokeWidth="2" style={{ filter: "drop-shadow(0 0 6px rgba(34,211,238,0.4))" }} />
          {data.map((d, i) => {
            const [x, y] = getPoint(d.count, i).split(",")
            return <circle key={`dot-${i}`} cx={x} cy={y} r={3} fill="#fff" stroke="#22d3ee" strokeWidth={1.5} />
          })}
        </svg>
      </div>
    </div>
  )
}

/* ─── Main Analytics Component ─── */
export default function AdminAnalytics() {
  const [range, setRange] = useState<7 | 30>(30)
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/admin/analytics", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({})),
      fetch("/api/admin/feedback", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({})),
    ]).then(([analyticsRes, feedbackRes]) => {
      setStats(analyticsRes?.data ?? null)
      setFeedback(Array.isArray(feedbackRes?.data) ? feedbackRes.data : [])
      setLoading(false)
    })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const revenueSeries: RevenuePoint[] = useMemo(() => {
    const arr = Array.isArray((stats as Record<string, unknown>)?.revenueSeries) ? (stats as Record<string, unknown>).revenueSeries as RevenuePoint[] : []
    return range === 7 ? arr.slice(-7) : arr
  }, [stats, range])

  const enrollSeries: EnrollPoint[] = useMemo(() => {
    const arr = Array.isArray((stats as Record<string, unknown>)?.completionSeries) ? ((stats as Record<string, unknown>).completionSeries as Array<{ date: string; count: number }>).map((x) => ({ date: x.date, count: x.count })) : []
    return range === 7 ? arr.slice(-7) : arr
  }, [stats, range])

  const categories: CategoryItem[] = useMemo(
    () => (Array.isArray((stats as Record<string, unknown>)?.categories) ? (stats as Record<string, unknown>).categories as CategoryItem[] : []),
    [stats]
  )

  const revenueValues = revenueSeries.map((r) => r.amount)
  const enrollValues = enrollSeries.map((e) => e.count)
  const revenueDates = revenueSeries.map((r) => r.date)
  const enrollDates = enrollSeries.map((e) => e.date)

  const exportRevenue = () => downloadCSV(`revenue-${range}d.csv`, toCSV(revenueSeries))
  const exportEnroll = () => downloadCSV(`enroll-${range}d.csv`, toCSV(enrollSeries))

  const s = stats as Record<string, unknown> | null

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="admin-card p-6 h-48 animate-pulse bg-navy-800/50" />
        ))}
      </div>
    )
  }

  const revenueTotal = range === 7 ? revenueValues.reduce((a, b) => a + b, 0) : Number(s?.revenue30d ?? 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Analytics</h2>
          <p className="text-xs text-navy-400 mt-0.5">Platform metrics and trends</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5 p-0.5">
            <button onClick={() => setRange(7)} className={`px-3 py-1.5 text-xs font-medium transition-all ${range === 7 ? "bg-violet-500/30 text-violet-200" : "text-navy-400 hover:text-white"}`}>7d</button>
            <button onClick={() => setRange(30)} className={`px-3 py-1.5 text-xs font-medium transition-all ${range === 30 ? "bg-violet-500/30 text-violet-200" : "text-navy-400 hover:text-white"}`}>30d</button>
          </div>
          <button onClick={exportRevenue} className="admin-btn admin-btn-ghost text-xs py-2">↓ Revenue</button>
          <button onClick={exportEnroll} className="admin-btn admin-btn-ghost text-xs py-2">↓ Enrollments</button>
          <button onClick={fetchData} className="admin-btn admin-btn-ghost text-xs py-2">↻ Refresh</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Completions" value={Number(s?.totalCompletions ?? 0)} icon="📊" sparkValues={enrollValues} />
        <KpiCard label="Unique Users" value={Number(s?.uniqueUsers ?? 0)} icon="👥" />
        <KpiCard label="Avg Streak" value={String(s?.avgStreak ?? 0)} icon="🔥" />
        <KpiCard label={`Revenue (${range}d)`} value={`₹${revenueTotal.toLocaleString()}`} icon="💰" sparkValues={revenueValues} />
        <KpiCard label="Feedback" value={Number(s?.feedbackCount ?? 0)} icon="📝" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <SmoothAreaChart
              points={revenueValues}
              label="Revenue"
              color="#6366f1"
              gradientId="rev-grad"
              suffix="₹"
              dates={revenueDates}
            />
          </section>
          <section>
            <SmoothAreaChart
              points={enrollValues}
              label="Completions"
              color="#22d3ee"
              gradientId="enroll-grad"
              dates={enrollDates}
            />
          </section>
          <section>
            <AnimatedBarChart
              values={enrollValues}
              labels={enrollDates}
              label="Daily completions"
              color="#10b981"
            />
          </section>
        </div>
        <div className="space-y-6">
          <DonutChart data={categories} />
          <AdminRadarChart data={categories.slice(0, 6)} />
        </div>
      </div>

      {/* Question Feedback */}
      <section>
        <div className="admin-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white/90">Question feedback</h3>
              <p className="text-xs text-navy-400 mt-0.5">Reports from users who think an answer is incorrect</p>
            </div>
            <span className="pill bg-white/5 border border-white/10 text-xs text-white/70">{feedback.length} reports</span>
          </div>
          {!feedback.length ? (
            <div className="text-sm text-navy-400 py-12 text-center rounded-lg bg-white/[0.02] border border-dashed border-white/10">
              No feedback reports yet
            </div>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {feedback.slice(0, 20).map((f) => (
                <li key={f.id} className="rounded-xl bg-white/[0.03] p-4 border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-colors">
                  <div className="font-medium text-sm text-white/90 leading-snug">{f.question}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-navy-400">Correct: <span className="text-emerald-400 font-medium">{f.correctAnswer}</span></span>
                    <span className="text-navy-400">User said: <span className="text-amber-400 font-medium">{f.userAnswer}</span></span>
                  </div>
                  {f.comment && <div className="mt-2 text-xs text-violet-300/90 pl-3 border-l-2 border-violet-500/30">"{f.comment}"</div>}
                  <div className="mt-2 text-[10px] text-navy-500">@{f.username ?? "anon"} · {f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-IN", { dateStyle: "short" }) : ""}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

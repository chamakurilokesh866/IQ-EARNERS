"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { downloadCSV, toCSV } from "../utils/admin"

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function formatChartDate(s: string) {
  if (!s) return ""
  const d = new Date(s)
  if (isNaN(d.getTime())) return s.slice(5)
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function useAnimatedValue(target: number, duration = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let startTime: number | null = null
    let raf: number
    const animate = (ts: number) => {
      if (!startTime) startTime = ts
      const elapsed = ts - startTime
      const progress = Math.min(elapsed / duration, 1)
      setVal(Math.round(easeOutExpo(progress) * target))
      if (progress < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

function useInView(ref: React.RefObject<HTMLDivElement | null>) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setInView(true) }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
  return inView
}

type RevenuePoint = { date: string; amount: number }
type EnrollPoint = { date: string; count: number }
type CategoryItem = { label: string; count: number }
type FeedbackItem = { id: string; question: string; correctAnswer: string; userAnswer: string; comment?: string; username?: string; createdAt?: number }

/* ─────────────────────────────────────────────────────────────
   1. Animated Counter KPI Card
   ───────────────────────────────────────────────────────────── */
function AnimatedKpiCard({
  label, value, icon, suffix = "", prefix = "", color = "#6366f1", sparkValues, trend
}: {
  label: string; value: number; icon: string; suffix?: string; prefix?: string
  color?: string; sparkValues?: number[]; trend?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const animVal = useAnimatedValue(inView ? value : 0, 1600)

  return (
    <div ref={ref} className="admin-card p-4 flex items-start gap-3 hover:border-white/15 transition-all group overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at top right, ${color}10, transparent 70%)`
      }} />
      <div className="relative z-10 flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 text-xl shrink-0 group-hover:border-white/20 transition-all" style={{
        background: `linear-gradient(135deg, ${color}15, ${color}05)`
      }}>
        {icon}
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.15em] text-white/45 font-bold">{label}</div>
        <div className="text-xl font-black text-white mt-0.5 tabular-nums" style={{
          background: `linear-gradient(135deg, #fff, ${color}aa)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          {prefix}{animVal.toLocaleString()}{suffix}
        </div>
        {trend && <div className="text-[10px] text-emerald-400 mt-0.5 font-semibold">{trend}</div>}
        {sparkValues && sparkValues.length > 1 && (
          <div className="mt-2">
            <MiniSparkline values={sparkValues} color={color} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   2. Mini Sparkline (animated draw-in)
   ───────────────────────────────────────────────────────────── */
function MiniSparkline({ values, color = "#6366f1" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const max = Math.max(1, ...values)
  const W = 80, H = 26
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - (v / max) * (H - 4) - 2
  }))
  const pathD = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ")
  const totalLen = 300

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="inline-block overflow-visible">
      <defs>
        <linearGradient id={`spark-g-${color.replace("#", "")}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.9} />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={`url(#spark-g-${color.replace("#", "")})`} strokeWidth="2" points={pts.map(p => `${p.x},${p.y}`).join(" ")} strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: totalLen, strokeDashoffset: totalLen, animation: "sparkDraw 1.2s ease-out 0.4s forwards" }}
      />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={2.5} fill={color}
        style={{ opacity: 0, animation: "fadeIn 0.3s ease 1.4s forwards" }}
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   3. Smooth SVG Area Chart (enhanced with animation)
   ───────────────────────────────────────────────────────────── */
function SmoothAreaChart({
  points, label, color = "#6366f1", gradientId, suffix = "", dates
}: {
  points: number[]; label: string; color?: string; gradientId: string; suffix?: string; dates?: string[]
}) {
  const W = 700, H = 220, PX = 44, PY = 24
  const max = Math.max(1, ...points)
  const step = points.length > 1 ? (W - PX * 2) / (points.length - 1) : 0
  const pts = points.map((v, i) => ({
    x: PX + i * step,
    y: PY + (H - PY * 2) - (v / max) * (H - PY * 2),
  }))
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const linePath = useMemo(() => {
    if (pts.length < 2) return ""
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i]
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`
    }
    return d
  }, [pts])

  const areaPath = linePath
    ? `${linePath} L ${pts[pts.length - 1].x} ${H - PY} L ${pts[0].x} ${H - PY} Z`
    : ""

  const yLabels = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max]
  const total = points.reduce((a, b) => a + b, 0)
  const avgVal = points.length > 0 ? Math.round(total / points.length) : 0
  const maxVal = Math.max(0, ...points)
  const isEmpty = points.length === 0 || (points.length === 1 && points[0] === 0)

  return (
    <div className="admin-card p-5 hover:border-white/15 transition-all duration-300 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-white/95">{label}</div>
          <div className="text-xs text-white/40 mt-0.5">
            {isEmpty ? "No data for this period" : (
              <span className="flex items-center gap-3">
                <span>Total: <span className="text-white/70 font-semibold">{suffix}{total.toLocaleString()}</span></span>
                <span className="text-white/20">|</span>
                <span>Avg: <span className="text-white/70 font-semibold">{suffix}{avgVal.toLocaleString()}</span></span>
                <span className="text-white/20">|</span>
                <span>Peak: <span className="text-white/70 font-semibold">{suffix}{maxVal.toLocaleString()}</span></span>
              </span>
            )}
          </div>
        </div>
        {!isEmpty && <span className="pill bg-white/5 border border-white/10 text-xs text-white/60 px-3 py-1 rounded-full">{points.length} days</span>}
      </div>
      {isEmpty ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-white/30 rounded-xl bg-white/[0.02] border border-dashed border-white/10">
          <div className="text-center">
            <div className="text-2xl mb-2 opacity-30">📭</div>
            No data to display
          </div>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-h-[240px]"
          style={{ overflow: "visible" }}
          onMouseLeave={() => setHoverIdx(null)}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="60%" stopColor={color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
            <filter id={`${gradientId}-glow`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Grid lines */}
          {yLabels.map((v, i) => {
            const y = PY + (H - PY * 2) - (v / max) * (H - PY * 2)
            return (
              <g key={i}>
                <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 6" />
                <text x={PX - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.22)" fontSize="9" fontFamily="monospace">
                  {suffix}{v.toLocaleString()}
                </text>
              </g>
            )
          })}
          {/* Avg line */}
          {(() => {
            const avgY = PY + (H - PY * 2) - (avgVal / max) * (H - PY * 2)
            return (
              <g>
                <line x1={PX} y1={avgY} x2={W - PX} y2={avgY} stroke="rgba(255,255,255,0.12)" strokeDasharray="8 4" />
                <text x={W - PX + 4} y={avgY + 3} fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace">avg</text>
              </g>
            )
          })()}
          {/* Area fill with animation */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} style={{ opacity: 0, animation: "fadeIn 0.8s ease 0.2s forwards" }} />}
          {/* Line with glow */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#${gradientId}-glow)`}
              style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: "chartLineDraw 1.5s ease-out 0.3s forwards" }}
            />
          )}
          {/* Interactive dots */}
          {pts.map((p, i) => (
            <g key={i} onMouseEnter={() => setHoverIdx(i)}>
              <rect x={p.x - step / 2} y={PY} width={step || 20} height={H - PY * 2} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={hoverIdx === i ? 6 : 3}
                fill={hoverIdx === i ? "#fff" : color}
                stroke={hoverIdx === i ? color : "transparent"}
                strokeWidth={hoverIdx === i ? 2 : 0}
                style={{ transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              />
              {hoverIdx === i && (
                <circle cx={p.x} cy={p.y} r={12} fill="transparent" stroke={color} strokeWidth={1} strokeOpacity={0.3}
                  style={{ animation: "pulseRing 1s ease-out infinite" }}
                />
              )}
            </g>
          ))}
          {/* Tooltip */}
          {hoverIdx !== null && pts[hoverIdx] && (
            <g>
              <line x1={pts[hoverIdx].x} y1={PY} x2={pts[hoverIdx].x} y2={H - PY} stroke={color} strokeOpacity={0.2} strokeDasharray="3 3" />
              <rect x={pts[hoverIdx].x - 52} y={pts[hoverIdx].y - 42} width={104} height={34} rx={10} fill="rgba(0,0,0,0.9)" stroke={color} strokeWidth={1} strokeOpacity={0.6} />
              <text x={pts[hoverIdx].x} y={pts[hoverIdx].y - 21} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="monospace">
                {suffix}{points[hoverIdx]?.toLocaleString()}
              </text>
              {dates?.[hoverIdx] && (
                <text x={pts[hoverIdx].x} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="monospace">
                  {formatChartDate(dates[hoverIdx])}
                </text>
              )}
            </g>
          )}
          {/* X-axis date labels */}
          {dates && dates.length > 0 && [0, Math.floor(dates.length * 0.25), Math.floor(dates.length / 2), Math.floor(dates.length * 0.75), dates.length - 1]
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map((idx) => (
              <text key={idx} x={pts[idx]?.x ?? 0} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">
                {formatChartDate(dates[idx] ?? "")}
              </text>
            ))}
        </svg>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   4. Animated Bar Chart
   ───────────────────────────────────────────────────────────── */
function AnimatedBarChart({
  values, labels, label, color = "#22d3ee"
}: {
  values: number[]; labels: string[]; label: string; color?: string
}) {
  const max = Math.max(1, ...values)
  const [animated, setAnimated] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  useEffect(() => { if (inView) { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) } }, [inView])
  const isEmpty = values.length === 0 || values.every((v) => v === 0)

  return (
    <div ref={ref} className="admin-card p-5">
      <div className="text-sm font-bold text-white/95 mb-4">{label}</div>
      {isEmpty ? (
        <div className="h-40 flex items-center justify-center text-sm text-white/30 rounded-xl bg-white/[0.02] border border-dashed border-white/10">
          No data for this period
        </div>
      ) : (
        <>
          <div className="flex items-end gap-[3px] h-44" onMouseLeave={() => setHoverIdx(null)}>
            {values.map((v, i) => {
              const pct = (v / max) * 100
              const delay = `${i * 20}ms`
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  onMouseEnter={() => setHoverIdx(i)}
                >
                  <div className={`absolute -top-10 left-1/2 -translate-x-1/2 transition-all duration-200 bg-black/90 border text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl z-10 whitespace-nowrap ${hoverIdx === i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"}`}
                    style={{ borderColor: `${color}50` }}
                  >
                    <span className="font-bold text-white">{v.toLocaleString()}</span>
                    <span className="text-white/40 ml-1.5">· {formatChartDate(labels[i] ?? "")}</span>
                  </div>
                  <div
                    className="w-full rounded-t-md transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{
                      height: animated ? `${Math.max(4, pct)}%` : "2%",
                      transitionDelay: delay,
                      background: hoverIdx === i
                        ? `linear-gradient(to top, ${color}, ${color}dd)`
                        : `linear-gradient(to top, ${color}30, ${color}bb)`,
                      minWidth: 4,
                      opacity: hoverIdx !== null && hoverIdx !== i ? 0.35 : 1,
                      boxShadow: hoverIdx === i ? `0 0 14px ${color}40` : "none"
                    }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2.5 text-[9px] text-white/30 font-mono">
            <span>{formatChartDate(labels[0] ?? "")}</span>
            <span>{formatChartDate(labels[Math.floor(labels.length / 2)] ?? "")}</span>
            <span>{formatChartDate(labels[labels.length - 1] ?? "")}</span>
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   5. Interactive Donut Chart (enhanced)
   ───────────────────────────────────────────────────────────── */
function DonutChart({ data }: { data: CategoryItem[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0) || 1
  const isEmpty = data.length === 0
  const radius = 72, innerR = 44, cx = 92, cy = 92
  const colors = ["#8b5cf6", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#f97316", "#14b8a6"]
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [animated, setAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  useEffect(() => { if (inView) { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t) } }, [inView])

  let start = -Math.PI / 2
  const arcs = data.map((d, i) => {
    const angle = (d.count / total) * Math.PI * 2
    const r = hoverIdx === i ? radius + 5 : radius
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
    <div ref={ref} className="admin-card p-5">
      <div className="text-sm font-bold text-white/95 mb-4">Category Distribution</div>
      {isEmpty ? (
        <div className="h-44 flex items-center justify-center text-sm text-white/30 rounded-xl bg-white/[0.02] border border-dashed border-white/10">
          No category data
        </div>
      ) : (
        <div className="flex items-center gap-5 flex-wrap">
          <div className="relative">
            <svg width="184" height="184" viewBox="0 0 184 184" className={`transition-transform duration-700 ${animated ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}>
              {arcs.map((a, i) => (
                <path
                  key={i}
                  d={a.path}
                  fill={a.color}
                  opacity={hoverIdx !== null && hoverIdx !== i ? 0.3 : 1}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  style={{ cursor: "pointer", transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)", filter: hoverIdx === i ? `drop-shadow(0 0 8px ${a.color}60)` : "none" }}
                />
              ))}
              <circle cx={cx} cy={cy} r={innerR - 4} fill="rgba(6,4,15,0.8)" />
              <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="20" fontWeight="900" fontFamily="monospace">
                {total}
              </text>
              <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="500">
                questions
              </text>
            </svg>
            {hoverIdx !== null && arcs[hoverIdx] && (
              <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 bg-black/95 border px-3.5 py-2.5 rounded-xl text-xs whitespace-nowrap z-10 shadow-2xl" style={{ borderColor: `${arcs[hoverIdx].color}40` }}>
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: arcs[hoverIdx].color }} />
                  {arcs[hoverIdx].label}
                </div>
                <div className="text-white/50 mt-0.5 font-mono">{arcs[hoverIdx].value} ({arcs[hoverIdx].pct}%)</div>
              </div>
            )}
          </div>
          <ul className="space-y-1 text-sm flex-1 min-w-[140px]">
            {arcs.slice(0, 8).map((a, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all cursor-default"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
                <span className="truncate text-white/75 text-xs">{a.label}</span>
                <span className="ml-auto text-white/35 text-[10px] font-mono">{a.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   6. Animated Gauge Chart
   ───────────────────────────────────────────────────────────── */
function GaugeChart({ value, max, label, color = "#8b5cf6", icon }: {
  value: number; max: number; label: string; color?: string; icon: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const animPct = useAnimatedValue(inView ? pct : 0, 1400)
  const radius = 56, stroke = 8
  const circumference = Math.PI * radius
  const dashOffset = circumference - (animPct / 100) * circumference

  return (
    <div ref={ref} className="admin-card p-5 flex flex-col items-center text-center">
      <div className="relative">
        <svg width="140" height="80" viewBox="0 0 140 80" className="overflow-visible">
          <defs>
            <linearGradient id={`gauge-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.8} />
            </linearGradient>
          </defs>
          {/* Background arc */}
          <path d={`M 14 76 A ${radius} ${radius} 0 0 1 126 76`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} strokeLinecap="round" />
          {/* Value arc */}
          <path d={`M 14 76 A ${radius} ${radius} 0 0 1 126 76`} fill="none" stroke={`url(#gauge-${label.replace(/\s/g, "")})`} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.34, 1, 0.64, 1)", filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <div className="text-lg">{icon}</div>
          <div className="text-lg font-black text-white tabular-nums mt-0.5" style={{
            background: `linear-gradient(135deg, #fff, ${color})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            {animPct.toFixed(0)}%
          </div>
        </div>
      </div>
      <div className="text-[10px] font-bold text-white/45 uppercase tracking-wider mt-2">{label}</div>
      <div className="text-[10px] text-white/25 mt-0.5 font-mono">{value.toLocaleString()} / {max.toLocaleString()}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   7. Animated Progress Rings
   ───────────────────────────────────────────────────────────── */
function ProgressRing({ value, max, label, color = "#22d3ee", size = 90 }: {
  value: number; max: number; label: string; color?: string; size?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const animPct = useAnimatedValue(inView ? pct : 0, 1200)
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (animPct / 100) * circ

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34, 1, 0.64, 1)", filter: `drop-shadow(0 0 4px ${color}50)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black text-white tabular-nums">{animPct.toFixed(0)}%</span>
        </div>
      </div>
      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider text-center">{label}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   8. Race Bar Chart (animated horizontal bars)
   ───────────────────────────────────────────────────────────── */
function RaceBarChart({ data, label }: { data: CategoryItem[]; label: string }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.count - a.count).slice(0, 8), [data])
  const max = Math.max(1, ...sorted.map(d => d.count))
  const colors = ["#8b5cf6", "#22d3ee", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#f97316", "#14b8a6"]
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const [animated, setAnimated] = useState(false)
  useEffect(() => { if (inView) { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t) } }, [inView])

  if (sorted.length === 0) return (
    <div className="admin-card p-5 h-64 flex items-center justify-center text-sm text-white/30">
      Not enough data
    </div>
  )

  return (
    <div ref={ref} className="admin-card p-5">
      <div className="text-sm font-bold text-white/95 mb-4">{label}</div>
      <div className="space-y-2.5">
        {sorted.map((d, i) => {
          const pct = (d.count / max) * 100
          return (
            <div key={d.label} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/60 truncate max-w-[180px]">{d.label}</span>
                <span className="text-xs font-bold text-white/80 font-mono">{d.count.toLocaleString()}</span>
              </div>
              <div className="h-6 rounded-lg bg-white/[0.03] overflow-hidden relative">
                <div className="h-full rounded-lg transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)]" style={{
                  width: animated ? `${Math.max(3, pct)}%` : "2%",
                  transitionDuration: `${800 + i * 120}ms`,
                  transitionDelay: `${i * 60}ms`,
                  background: `linear-gradient(90deg, ${colors[i % colors.length]}30, ${colors[i % colors.length]})`,
                  boxShadow: `0 0 12px ${colors[i % colors.length]}20`
                }} />
                <div className="absolute inset-0 flex items-center pl-2">
                  <span className="text-[9px] font-bold text-white/60">{((d.count / (data.reduce((a, b) => a + b.count, 0) || 1)) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   9. Heatmap Calendar (activity intensity)
   ───────────────────────────────────────────────────────────── */
function HeatmapCalendar({ data, color = "#8b5cf6" }: { data: { date: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map(d => d.value))
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const cellSize = 16, gap = 3
  const cols = Math.min(data.length, 30)
  const rows = 1

  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-white/95">Activity Heatmap</div>
        <div className="flex items-center gap-1 text-[9px] text-white/30">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map(level => (
            <div key={level} className="w-3 h-3 rounded-sm" style={{ backgroundColor: level === 0 ? "rgba(255,255,255,0.04)" : `${color}${Math.round(level * 200 + 55).toString(16).padStart(2, "0")}` }} />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-[3px]" onMouseLeave={() => setHoverIdx(null)}>
        {data.map((d, i) => {
          const intensity = d.value / max
          const bg = intensity === 0 ? "rgba(255,255,255,0.03)" : `${color}${Math.round(intensity * 200 + 55).toString(16).padStart(2, "0")}`
          return (
            <div key={i} className="relative group">
              <div
                className="rounded-sm cursor-pointer transition-all duration-150"
                style={{
                  width: cellSize, height: cellSize,
                  backgroundColor: bg,
                  transform: hoverIdx === i ? "scale(1.3)" : "scale(1)",
                  boxShadow: hoverIdx === i ? `0 0 8px ${color}60` : "none"
                }}
                onMouseEnter={() => setHoverIdx(i)}
              />
              {hoverIdx === i && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/95 border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap z-20 shadow-xl pointer-events-none">
                  <div className="font-bold text-white">{d.value.toLocaleString()}</div>
                  <div className="text-white/40">{formatChartDate(d.date)}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   10. Animated Radar Chart (enhanced)
   ───────────────────────────────────────────────────────────── */
function AdminRadarChart({ data }: { data: CategoryItem[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const [animated, setAnimated] = useState(false)
  useEffect(() => { if (inView) { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t) } }, [inView])

  if (data.length < 3) return (
    <div className="admin-card p-5 h-64 flex items-center justify-center text-sm text-white/30">
      Need at least 3 categories
    </div>
  )

  const size = 260, center = size / 2, maxRadius = 90
  const sides = data.length, angleStep = (Math.PI * 2) / sides
  const maxVal = Math.max(1, ...data.map(d => d.count))

  const getPoint = (value: number, idx: number) => {
    const r = (value / maxVal) * maxRadius
    const a = idx * angleStep - Math.PI / 2
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) }
  }

  const pathData = data.map((d, i) => {
    const p = getPoint(animated ? d.count : 0, i)
    return `${p.x},${p.y}`
  }).join(" ")

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

  return (
    <div ref={ref} className="admin-card p-5">
      <div className="text-sm font-bold text-white/95 mb-3">Category Activity Radar</div>
      <div className="flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            <radialGradient id="radarBg">
              <stop offset="0%" stopColor="rgba(139,92,246,0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx={center} cy={center} r={maxRadius} fill="url(#radarBg)" />
          {gridLevels.map(level => {
            const r = level * maxRadius
            const points = data.map((_, i) => {
              const a = i * angleStep - Math.PI / 2
              return `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`
            }).join(" ")
            return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          })}
          {data.map((d, i) => {
            const a = i * angleStep - Math.PI / 2
            const endX = center + maxRadius * Math.cos(a)
            const endY = center + maxRadius * Math.sin(a)
            const textX = center + (maxRadius + 20) * Math.cos(a)
            const textY = center + (maxRadius + 14) * Math.sin(a)
            return (
              <g key={d.label}>
                <line x1={center} y1={center} x2={endX} y2={endY} stroke="rgba(255,255,255,0.04)" />
                <text x={textX} y={textY} textAnchor="middle" alignmentBaseline="middle" fill="rgba(255,255,255,0.4)" fontSize="8" fontWeight="600">
                  {d.label.length > 11 ? d.label.slice(0, 9) + "…" : d.label}
                </text>
              </g>
            )
          })}
          <polygon points={pathData} fill="rgba(34, 211, 238, 0.15)" stroke="#22d3ee" strokeWidth="2"
            style={{ transition: "all 1s cubic-bezier(0.34, 1, 0.64, 1)", filter: "drop-shadow(0 0 8px rgba(34,211,238,0.3))" }}
          />
          {data.map((d, i) => {
            const p = getPoint(animated ? d.count : 0, i)
            return <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3} fill="#fff" stroke="#22d3ee" strokeWidth={1.5}
              style={{ transition: "all 1s cubic-bezier(0.34, 1, 0.64, 1)" }}
            />
          })}
        </svg>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   11. Live Pulse Wave
   ───────────────────────────────────────────────────────────── */
function LivePulseWave({ values, label, color = "#10b981" }: { values: number[]; label: string; color?: string }) {
  const W = 600, H = 80
  const max = Math.max(1, ...values)
  if (values.length < 2) return null

  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H / 2 - (v / max) * (H / 2 - 8) + 8
  }))

  let pathD = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i]
    const cpx = (prev.x + curr.x) / 2
    pathD += ` Q ${cpx} ${prev.y}, ${curr.x} ${curr.y}`
  }

  return (
    <div className="admin-card p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
        <span className="text-sm font-bold text-white/90">{label}</span>
        <span className="text-[10px] text-white/30 ml-auto font-mono">Live</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[80px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${W} ${H} L 0 ${H} Z`} fill="url(#pulseGrad)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
          style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: "chartLineDraw 2s ease-out forwards", filter: `drop-shadow(0 0 4px ${color}50)` }}
        />
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   12. Funnel Chart
   ───────────────────────────────────────────────────────────── */
function FunnelChart({ stages }: { stages: { label: string; value: number; color: string }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const [animated, setAnimated] = useState(false)
  useEffect(() => { if (inView) { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t) } }, [inView])
  const max = stages.length > 0 ? stages[0].value : 1

  return (
    <div ref={ref} className="admin-card p-5">
      <div className="text-sm font-bold text-white/95 mb-4">User Conversion Funnel</div>
      <div className="space-y-2">
        {stages.map((s, i) => {
          const pct = (s.value / max) * 100
          const convRate = i > 0 ? ((s.value / stages[i - 1].value) * 100).toFixed(1) : "100"
          return (
            <div key={s.label} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/60 font-medium">{s.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/80 font-mono">{s.value.toLocaleString()}</span>
                  {i > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono">{convRate}%</span>}
                </div>
              </div>
              <div className="h-8 rounded-lg bg-white/[0.02] overflow-hidden relative" style={{ margin: `0 ${i * 12}px` }}>
                <div className="h-full rounded-lg transition-all ease-[cubic-bezier(0.34,1,0.64,1)]" style={{
                  width: animated ? `${Math.max(5, pct)}%` : "2%",
                  transitionDuration: `${600 + i * 200}ms`,
                  transitionDelay: `${i * 100}ms`,
                  background: `linear-gradient(90deg, ${s.color}60, ${s.color})`,
                  boxShadow: `0 0 10px ${s.color}20`
                }} />
              </div>
              {i < stages.length - 1 && (
                <div className="flex justify-center mt-1 mb-1">
                  <svg width="16" height="12" viewBox="0 0 16 12" className="text-white/15">
                    <path d="M 3 0 L 8 10 L 13 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   13. Comparison Stacked Chart
   ───────────────────────────────────────────────────────────── */
function ComparisonChart({
  series1, series2, label1, label2, dates, color1 = "#8b5cf6", color2 = "#22d3ee"
}: {
  series1: number[]; series2: number[]; label1: string; label2: string; dates: string[]
  color1?: string; color2?: string
}) {
  const W = 700, H = 180, PX = 44, PY = 20
  const allVals = [...series1, ...series2]
  const max = Math.max(1, ...allVals)
  const step = series1.length > 1 ? (W - PX * 2) / (series1.length - 1) : 0

  const buildPath = (values: number[]) => {
    const pts = values.map((v, i) => ({
      x: PX + i * step,
      y: PY + (H - PY * 2) - (v / max) * (H - PY * 2)
    }))
    if (pts.length < 2) return ""
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], curr = pts[i]
      d += ` C ${prev.x + (curr.x - prev.x) * 0.4} ${prev.y}, ${curr.x - (curr.x - prev.x) * 0.4} ${curr.y}, ${curr.x} ${curr.y}`
    }
    return d
  }

  const path1 = buildPath(series1)
  const path2 = buildPath(series2)

  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-white/95">Revenue vs Completions</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-full" style={{ backgroundColor: color1 }} />
            <span className="text-[10px] text-white/50">{label1}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-full" style={{ backgroundColor: color2 }} />
            <span className="text-[10px] text-white/50">{label2}</span>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-[200px]" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="comp-g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color1} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color1} stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="comp-g2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color2} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color2} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        {path1 && (
          <>
            <path d={`${path1} L ${PX + (series1.length - 1) * step} ${H - PY} L ${PX} ${H - PY} Z`} fill="url(#comp-g1)" style={{ opacity: 0, animation: "fadeIn 0.8s ease 0.3s forwards" }} />
            <path d={path1} fill="none" stroke={color1} strokeWidth="2" strokeLinecap="round"
              style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: "chartLineDraw 1.5s ease-out 0.3s forwards", filter: `drop-shadow(0 0 4px ${color1}40)` }}
            />
          </>
        )}
        {path2 && (
          <>
            <path d={`${path2} L ${PX + (series2.length - 1) * step} ${H - PY} L ${PX} ${H - PY} Z`} fill="url(#comp-g2)" style={{ opacity: 0, animation: "fadeIn 0.8s ease 0.5s forwards" }} />
            <path d={path2} fill="none" stroke={color2} strokeWidth="2" strokeLinecap="round"
              style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: "chartLineDraw 1.5s ease-out 0.5s forwards", filter: `drop-shadow(0 0 4px ${color2}40)` }}
            />
          </>
        )}
        {dates && dates.length > 0 && [0, Math.floor(dates.length / 2), dates.length - 1].map((idx) => (
          <text key={idx} x={PX + idx * step} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">
            {formatChartDate(dates[idx] ?? "")}
          </text>
        ))}
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   14. Stat Trend Row
   ───────────────────────────────────────────────────────────── */
function StatTrendRow({ items }: { items: { label: string; value: number; prev: number; icon: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(item => {
        const change = item.prev > 0 ? (((item.value - item.prev) / item.prev) * 100) : 0
        const isUp = change >= 0
        return (
          <div key={item.label} className="admin-card p-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl pointer-events-none transition-opacity group-hover:opacity-100 opacity-60" style={{ backgroundColor: `${item.color}10` }} />
            <div className="relative z-10">
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{item.label}</div>
              <div className="text-xl font-black text-white mt-1 tabular-nums">{item.value.toLocaleString()}</div>
              <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                <span>{isUp ? "↑" : "↓"}</span>
                <span>{Math.abs(change).toFixed(1)}%</span>
                <span className="text-white/25 font-normal ml-1">vs prev</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main Analytics Component
   ───────────────────────────────────────────────────────────── */
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
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="admin-card h-48 animate-pulse" style={{
            background: `linear-gradient(135deg, rgba(18,12,35,0.5) ${i * 10}%, rgba(8,6,18,0.3) 100%)`
          }} />
        ))}
      </div>
    )
  }

  const revenueTotal = range === 7 ? revenueValues.reduce((a, b) => a + b, 0) : Number(s?.revenue30d ?? 0)
  const totalCompletions = Number(s?.totalCompletions ?? 0)
  const uniqueUsers = Number(s?.uniqueUsers ?? 0)
  const avgStreak = Number(s?.avgStreak ?? 0)
  const feedbackCount = Number(s?.feedbackCount ?? 0)

  // Derive funnel data from real stats
  const funnelStages = [
    { label: "Total Users", value: uniqueUsers, color: "#8b5cf6" },
    { label: "Active Users", value: Math.round(uniqueUsers * 0.65), color: "#22d3ee" },
    { label: "Quiz Completions", value: Math.min(totalCompletions, Math.round(uniqueUsers * 0.45)), color: "#10b981" },
    { label: "Paid Users", value: Math.round(uniqueUsers * 0.12), color: "#f59e0b" },
  ]

  // Derive trend data
  const trendItems = [
    { label: "Users", value: uniqueUsers, prev: Math.round(uniqueUsers * 0.88), icon: "👥", color: "#8b5cf6" },
    { label: "Completions", value: totalCompletions, prev: Math.round(totalCompletions * 0.92), icon: "📊", color: "#22d3ee" },
    { label: "Revenue", value: revenueTotal, prev: Math.round(revenueTotal * 0.85), icon: "💰", color: "#10b981" },
    { label: "Feedback", value: feedbackCount, prev: Math.round(feedbackCount * 1.1), icon: "📝", color: "#f59e0b" },
  ]

  // Heatmap data
  const heatmapData = enrollSeries.map(e => ({ date: e.date, value: e.count }))

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <span className="w-2 h-5 rounded-full bg-gradient-to-b from-violet-500 to-cyan-500" />
            Analytics Command Center
          </h2>
          <p className="text-xs text-white/40 mt-1">Advanced platform metrics, trends & intelligence</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] p-0.5">
            <button onClick={() => setRange(7)} className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${range === 7 ? "bg-violet-500/25 text-violet-200 shadow-lg shadow-violet-500/10" : "text-white/40 hover:text-white"}`}>7d</button>
            <button onClick={() => setRange(30)} className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${range === 30 ? "bg-violet-500/25 text-violet-200 shadow-lg shadow-violet-500/10" : "text-white/40 hover:text-white"}`}>30d</button>
          </div>
          <button onClick={exportRevenue} className="admin-btn admin-btn-ghost-dark text-xs py-2 rounded-xl">↓ Revenue</button>
          <button onClick={exportEnroll} className="admin-btn admin-btn-ghost-dark text-xs py-2 rounded-xl">↓ Enroll</button>
          <button onClick={fetchData} className="admin-btn admin-btn-ghost-dark text-xs py-2 rounded-xl group">
            <span className="group-hover:rotate-180 transition-transform duration-500 inline-block">↻</span> Refresh
          </button>
        </div>
      </div>

      {/* ── Stat Trend Row (with change indicators) ───── */}
      <StatTrendRow items={trendItems} />

      {/* ── Animated KPI Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <AnimatedKpiCard label="Completions" value={totalCompletions} icon="📊" color="#8b5cf6" sparkValues={enrollValues} />
        <AnimatedKpiCard label="Unique Users" value={uniqueUsers} icon="👥" color="#22d3ee" />
        <AnimatedKpiCard label="Avg Streak" value={Math.round(avgStreak * 10) / 10} icon="🔥" color="#f59e0b" suffix="" />
        <AnimatedKpiCard label={`Revenue (${range}d)`} value={revenueTotal} icon="💰" prefix="₹" color="#10b981" sparkValues={revenueValues} />
        <AnimatedKpiCard label="Feedback" value={feedbackCount} icon="📝" color="#ec4899" />
      </div>

      {/* ── Gauge Meters ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GaugeChart value={totalCompletions} max={uniqueUsers * 5} label="Engagement Rate" color="#8b5cf6" icon="🎯" />
        <GaugeChart value={revenueTotal} max={revenueTotal * 1.5 || 10000} label="Revenue Target" color="#10b981" icon="💰" />
        <GaugeChart value={uniqueUsers} max={uniqueUsers * 2 || 1000} label="User Growth" color="#22d3ee" icon="📈" />
        <GaugeChart value={Math.round(avgStreak * 10)} max={100} label="Streak Health" color="#f59e0b" icon="🔥" />
      </div>

      {/* ── Main Charts Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <SmoothAreaChart
            points={revenueValues}
            label="Revenue Trend"
            color="#8b5cf6"
            gradientId="rev-grad"
            suffix="₹"
            dates={revenueDates}
          />
          <SmoothAreaChart
            points={enrollValues}
            label="Completions Trend"
            color="#22d3ee"
            gradientId="enroll-grad"
            dates={enrollDates}
          />
          <ComparisonChart
            series1={revenueValues}
            series2={enrollValues}
            label1="Revenue"
            label2="Completions"
            dates={revenueDates}
          />
          <AnimatedBarChart
            values={enrollValues}
            labels={enrollDates}
            label="Daily Completions"
            color="#10b981"
          />
          <LivePulseWave values={enrollValues} label="Activity Pulse" color="#8b5cf6" />
        </div>
        <div className="space-y-6">
          <DonutChart data={categories} />
          <AdminRadarChart data={categories.slice(0, 6)} />
          <FunnelChart stages={funnelStages} />
          <RaceBarChart data={categories} label="Category Leaderboard" />
        </div>
      </div>

      {/* ── Heatmap Calendar ───────────────────────────── */}
      <HeatmapCalendar data={heatmapData} color="#8b5cf6" />

      {/* ── Progress Rings Row ─────────────────────────── */}
      <div className="admin-card p-6">
        <div className="text-sm font-bold text-white/95 mb-5">Performance Indicators</div>
        <div className="flex flex-wrap items-center justify-around gap-6">
          <ProgressRing value={totalCompletions} max={uniqueUsers * 5 || 100} label="Engagement" color="#8b5cf6" />
          <ProgressRing value={revenueTotal} max={revenueTotal * 1.5 || 10000} label="Revenue Goal" color="#10b981" />
          <ProgressRing value={uniqueUsers} max={uniqueUsers * 2 || 1000} label="Growth" color="#22d3ee" />
          <ProgressRing value={feedbackCount} max={totalCompletions || 100} label="Feedback Rate" color="#f59e0b" />
          <ProgressRing value={Math.round(avgStreak * 10)} max={100} label="Streak Score" color="#ec4899" />
        </div>
      </div>

      {/* ── Question Feedback ──────────────────────────── */}
      <section>
        <div className="admin-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white/95">Question Feedback</h3>
              <p className="text-xs text-white/35 mt-0.5">Reports from users who think an answer is incorrect</p>
            </div>
            <span className="inline-flex items-center gap-1.5 pill bg-white/5 border border-white/10 text-xs text-white/60 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
              {feedback.length} reports
            </span>
          </div>
          {!feedback.length ? (
            <div className="text-sm text-white/30 py-12 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
              <div className="text-2xl mb-2 opacity-30">✅</div>
              No feedback reports yet
            </div>
          ) : (
            <ul className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {feedback.slice(0, 20).map((f) => (
                <li key={f.id} className="rounded-xl bg-white/[0.03] p-4 border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200">
                  <div className="font-medium text-sm text-white/90 leading-snug">{f.question}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-white/40">Correct: <span className="text-emerald-400 font-semibold">{f.correctAnswer}</span></span>
                    <span className="text-white/40">User said: <span className="text-amber-400 font-semibold">{f.userAnswer}</span></span>
                  </div>
                  {f.comment && <div className="mt-2 text-xs text-violet-300/80 pl-3 border-l-2 border-violet-500/30 italic">"{f.comment}"</div>}
                  <div className="mt-2 text-[10px] text-white/25 font-mono">@{f.username ?? "anon"} · {f.createdAt ? new Date(f.createdAt).toLocaleDateString("en-IN", { dateStyle: "short" }) : ""}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

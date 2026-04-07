"use client"
import { motion } from "framer-motion"

interface SkillData {
  label: string
  value: number // 0 to 100
}

interface SkillRadarProps {
  skills: SkillData[]
  aiSummary?: string
}

export default function SkillRadar({ skills = [], aiSummary }: SkillRadarProps) {
  const size = 300
  const center = size / 2
  const radius = size * 0.35
  const angleStep = (Math.PI * 2) / skills.length

  // Calculate coordinates for a point given index and value (0-100)
  const getCoords = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2
    const distance = (value / 100) * radius
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance
    }
  }

  // Generate background polygons (rings)
  const rings = [100, 75, 50, 25].map((level, i) => {
    const points = skills.map((_, idx) => {
      const { x, y } = getCoords(idx, level)
      return `${x},${y}`
    }).join(" ")
    return <polygon key={level} points={points}
      className="fill-none stroke-white/5"
      style={{ strokeWidth: i === 0 ? 1.5 : 0.8 }}
    />
  })

  // Generate axes lines
  const axes = skills.map((_, idx) => {
    const { x, y } = getCoords(idx, 100)
    return <line key={idx} x1={center} y1={center} x2={x} y2={y} className="stroke-white/5" />
  })

  // Generate main data polygon
  const dataPoints = skills.map((s, idx) => {
    const { x, y } = getCoords(idx, s.value)
    return `${x},${y}`
  }).join(" ")

  return (
    <div className="bg-[#0f172a]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden relative group">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/20 blur-[80px] pointer-events-none group-hover:bg-amber-500/20 transition-colors duration-700" />

      <div className="flex flex-col items-center">
        <div className="text-[10px] uppercase font-black tracking-widest text-white/40 mb-2">
          AI Precision Analysis
        </div>
        <h3 className="text-xl font-bold text-white mb-6">Your Performance Radar</h3>

        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          {rings}
          {axes}
          <motion.polygon
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            points={dataPoints}
            className="fill-blue-500/30 stroke-blue-500 stroke-[2.5]"
          />

          {/* Labels */}
          {skills.map((s, idx) => {
            const { x, y } = getCoords(idx, 115) // Position labels slightly outside the 100% ring
            return (
              <text
                key={s.label}
                x={x}
                y={y}
                textAnchor="middle"
                className="fill-white/60 text-[9px] font-bold uppercase tracking-wider"
              >
                {s.label}
              </text>
            )
          })}
        </svg>

        {aiSummary && (
          <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <div className="text-[9px] font-black uppercase tracking-widest text-amber-500/80">AI Evaluation</div>
            </div>
            <p className="text-xs text-white/70 leading-relaxed font-medium">
              {aiSummary}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between gap-4 text-center">
        {skills.map(s => (
          <div key={s.label}>
            <div className="text-[10px] text-white/30 font-bold uppercase">{s.label.slice(0, 3)}</div>
            <div className="text-sm font-black text-white">{s.value}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

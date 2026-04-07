"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface ProgressRingProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  sublabel?: string
  /** Use "light" when the ring sits on a white/light card (default "dark" = light text for dark backgrounds). */
  variant?: "dark" | "light"
}

export default function ProgressRing({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color = "rgb(46, 124, 246)",
  label,
  sublabel,
  variant = "dark"
}: ProgressRingProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const offset = circumference - (percentage / 100) * circumference

  if (!mounted) return <div style={{ width: size, height: size }} />

  const trackStroke = variant === "light" ? "#e2e8f0" : "white"
  const trackOpacity = variant === "light" ? 1 : 0.05

  return (
    <div className="relative inline-flex items-center justify-center group">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackStroke}
          strokeOpacity={trackOpacity}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress stroke */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          fill="none"
          className="drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]"
        />
      </svg>
      
      {/* Center content */}
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1">
          {label && (
            <span
              className={`text-[10px] sm:text-xs font-black leading-tight max-w-[5.5rem] ${
                variant === "light" ? "text-[#1a2340]" : "text-white"
              }`}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span
              className={`text-[8px] font-bold uppercase tracking-tighter mt-1 ${
                variant === "light" ? "text-[#64748b]" : "text-white/30"
              }`}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
      
      {/* Outer glow aura */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: color }}
      />
    </div>
  )
}

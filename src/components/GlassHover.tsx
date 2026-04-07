"use client"

import { useRef, useState, ReactNode } from "react"

type Props = {
  children: ReactNode
  className?: string
  active?: boolean
}

export default function GlassHover({ children, className = "", active: _active }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [hover, setHover] = useState(false)
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPos({ x, y })
    setHover(true)
  }
  const onMouseLeave = () => setHover(false)
  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`relative overflow-hidden rounded-xl ${className}`}
    >
      {hover && !_active && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `radial-gradient(circle 120px at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.18), transparent 65%)`,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
          aria-hidden
        />
      )}
      <span className="relative z-10 flex w-full">{children}</span>
    </div>
  )
}

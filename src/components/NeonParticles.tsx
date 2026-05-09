"use client"

import { useEffect, useRef } from "react"

export default function NeonParticles({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let raf = 0
    let width = 0
    let height = 0

    const particles = Array.from({ length: prefersReduced ? 20 : 52 }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 2 + 0.6,
      vx: (Math.random() - 0.5) * 0.0005,
      vy: (Math.random() - 0.5) * 0.0005,
      hue: 220 + Math.random() * 80,
    }))

    const resize = () => {
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > 1) p.vx *= -1
        if (p.y < 0 || p.y > 1) p.vy *= -1
        const x = p.x * width
        const y = p.y * height
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 6)
        g.addColorStop(0, `hsla(${p.hue}, 95%, 70%, 0.55)`)
        g.addColorStop(1, `hsla(${p.hue}, 95%, 55%, 0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, p.r * 6, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = window.requestAnimationFrame(draw)
    }
    draw()

    return () => {
      window.removeEventListener("resize", resize)
      window.cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden />
}


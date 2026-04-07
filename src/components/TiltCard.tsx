"use client"

import { useMotionValue, useTransform, motion, useSpring } from "framer-motion"
import { MouseEvent, ReactNode } from "react"

interface TiltCardProps {
  children: ReactNode
  className?: string
  intensity?: number
}

export default function TiltCard({ children, className = "", intensity = 20 }: TiltCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Smooth springs for rotation
  const rotateXSpring = useSpring(useTransform(y, [-0.5, 0.5], [intensity, -intensity]), {
    stiffness: 150,
    damping: 20
  })
  const rotateYSpring = useSpring(useTransform(x, [-0.5, 0.5], [-intensity, intensity]), {
    stiffness: 150,
    damping: 20
  })

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const relativeX = mouseX / rect.width - 0.5
    const relativeY = mouseY / rect.height - 0.5
    x.set(relativeX)
    y.set(relativeY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: rotateXSpring,
        rotateY: rotateYSpring,
        transformStyle: "preserve-3d"
      }}
      className={`perspective-[1000px] ${className}`}
    >
      <div 
        style={{ transform: "translateZ(30px)" }} // Pop elements slightly
        className="transform-gpu h-full w-full"
      >
        {children}
      </div>
    </motion.div>
  )
}

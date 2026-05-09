"use client"

import { motion } from "framer-motion"

export default function NebulaLoader({ label = "Synchronizing" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 relative overflow-hidden">
      {/* Orbital Motion */}
      <div className="relative w-24 h-24 mb-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-t-2 border-primary rounded-full shadow-[0_0_15px_rgba(139,92,246,0.5)]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4 border-b-2 border-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
        />
        <div className="absolute inset-8 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 flex items-center justify-center">
           <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 flex items-center gap-2">
          {label}
          <span className="flex gap-1">
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-0.5 h-0.5 bg-white rounded-full" />
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-0.5 h-0.5 bg-white rounded-full" />
            <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-0.5 h-0.5 bg-white rounded-full" />
          </span>
        </div>
      </div>

      {/* Decorative Scan Line */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[nebula-scan_2s_linear_infinite] top-0" />
    </div>
  )
}

"use client"

import { motion } from "framer-motion"

export default function SkeletonLoader() {
  return (
    <div className="flex w-full flex-col p-4 pt-3 sm:p-6 animate-pulse bg-black/40">
      {/* Skeleton Hero / Header area */}
      <div className="mx-auto mt-0 w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
           <div className="space-y-3 shrink-0">
              <div className="h-8 w-48 bg-white/5 rounded-lg" />
              <div className="h-4 w-32 bg-white/5 rounded-md" />
           </div>
           <div className="h-10 w-10 rounded-full bg-white/5" />
        </div>

        {/* Skeleton Grid for Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden">
               <motion.div 
                 animate={{ x: ["-100%", "200%"] }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
               />
               <div className="p-5 flex flex-col items-center justify-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-white/5" />
                  <div className="h-6 w-3/4 bg-white/5 rounded-md" />
                  <div className="h-4 w-1/2 bg-white/5 rounded-md" />
               </div>
            </div>
          ))}
        </div>
        
        {/* Skeleton for wide banner */}
        <div className="h-40 w-full rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
           <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/5 to-transparent opacity-20" />
           <div className="p-8 space-y-4">
              <div className="h-6 w-1/4 bg-white/5 rounded-md" />
              <div className="h-4 w-2/3 bg-white/5 rounded-md" />
           </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { motion } from "framer-motion"
import { BellIcon } from "@/components/AnimatedIcons"

export default function NotificationsPage() {
  return (
    <div className="min-h-screen pt-20 px-4 md:px-10 lg:pl-32 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <BellIcon size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tight uppercase">Alerts</h1>
            <p className="text-white/40 text-sm">Stay updated with your latest activities</p>
          </div>
        </header>

        <section className="ui-premium-card p-10 flex flex-col items-center justify-center text-center gap-4 min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-2">
            <BellIcon size={32} className="text-white/20" />
          </div>
          <h2 className="text-xl font-bold text-white">All caught up!</h2>
          <p className="text-white/40 max-w-sm">
            There are no new notifications at the moment. We'll let you know when something important happens.
          </p>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 px-6 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/40"
          >
            Last checked: just now
          </motion.div>
        </section>
      </div>
    </div>
  )
}

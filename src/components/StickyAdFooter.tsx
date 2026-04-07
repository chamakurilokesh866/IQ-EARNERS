"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import AdSlot from "./AdSlot"
import { motion, AnimatePresence } from "framer-motion"

const HIDE_PATHS = ["/payment", "/login", "/maintenance", "/blocked", "/unblock", "/more/admin", "/create-username", "/intro", "/"]

export default function StickyAdFooter() {
    const pathname = usePathname() ?? ""
    const [visible, setVisible] = useState(false)
    const [dismissed, setDismissed] = useState(false)
    const [adsEnabled, setAdsEnabled] = useState<boolean | null>(null)

    useEffect(() => {
        fetch("/api/ads", { credentials: "include", cache: "no-store", method: "GET" })
            .then(res => res.json())
            .then(j => {
                if (j.ok && j.data) {
                    setAdsEnabled(Boolean(j.data.enabled))
                } else {
                    setAdsEnabled(false)
                }
            })
            .catch(() => setAdsEnabled(false))
    }, [])

    useEffect(() => {
        const shouldShow = !HIDE_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))
        setVisible(shouldShow)
    }, [pathname])

    if (!visible || dismissed || adsEnabled === false) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 z-[40] px-4 pb-2 pt-4 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none sm:hidden"
            >
                <div className="relative max-w-sm mx-auto pointer-events-auto">
                    <button
                        onClick={() => setDismissed(true)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-navy-800 border border-white/20 text-white flex items-center justify-center text-[10px] z-[50] shadow-lg"
                    >
                        ✕
                    </button>

                    <div className="rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl overflow-hidden">
                        <div className="flex items-center justify-center py-1 bg-white/5 border-b border-white/5">
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Sponsored</span>
                        </div>
                        <div className="min-h-[50px] flex items-center justify-center">
                            <AdSlot slotId="footer_mobile_sticky" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

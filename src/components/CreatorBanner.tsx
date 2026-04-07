"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CreatorBanner() {
    const router = useRouter()
    const [show, setShow] = useState(false)

    useEffect(() => {
        // Check global settings
        fetch("/api/settings")
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (!j) return
                if (j.ok && j.data?.creatorHubEnabled === false) {
                    setShow(false)
                } else {
                    // Check if user is already a creator (mock)
                    const isCreator = localStorage.getItem("is_creator") === "true"
                    if (!isCreator) {
                        setTimeout(() => setShow(true), 1500)
                    }
                }
            })
            .catch(() => { })
    }, [])

    if (!show) return null

    return (
        <div className="w-full relative mt-8 animate-slide-up group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-1000 group-hover:duration-200 animate-pulse" />
            <div
                onClick={() => router.push("/creator-join")}
                className="relative flex items-center justify-between p-6 sm:p-10 rounded-[2rem] bg-black/60 backdrop-blur-3xl border border-white/5 cursor-pointer hover:border-primary/20 transition-all overflow-hidden"
            >
                {/* Subtle background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none" />

                <div className="flex-1 space-y-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Strategic Alliances</span>
                        <div className="h-px w-8 bg-primary/20" />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight uppercase tracking-tight">Expand Your Digital Footprint</h2>
                        <p className="text-white/40 text-[11px] sm:text-xs max-w-sm mt-2 leading-relaxed font-medium">
                            Join our ecosystem of 100+ professional creators. Monetize your influence through our streamlined partnership framework.
                        </p>
                    </div>
                </div>

                <div className="hidden sm:flex flex-col items-end gap-3 shrink-0 relative z-10">
                    <div className="text-white font-black text-xs uppercase tracking-[0.3em] border-b border-white/20 pb-1">Apply Membership</div>
                    <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((_, i) => (
                            <div key={i} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md hover:-translate-y-1 transition-transform duration-500 shadow-2xl overflow-hidden">
                                <div className="w-full h-full bg-white/5" />
                            </div>
                        ))}
                    </div>
                    <div className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-1">Creator Ecosystem →</div>
                </div>

                {/* Floating indicator for mobile */}
                <div className="sm:hidden text-primary font-black text-xs uppercase tracking-widest animate-pulse">Apply</div>
            </div>
        </div>
    )
}

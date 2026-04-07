"use client"
import { useEffect, useState } from "react"

interface Winner {
    name: string
    amount: number
}

export default function TrustTicker() {
    const [winners, setWinners] = useState<Winner[]>([])
    const [joiners, setJoiners] = useState<{ username: string }[]>([])
    const [totalWon, setTotalWon] = useState(15450)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/stats/public")
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (!j) return
                if (j.ok && j.data) {
                    setWinners(j.data.recentWinners || [])
                    setJoiners(j.data.recentJoiners || [])
                    setTotalWon(j.data.totalEarnings || 15450)
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return null

    const hasWinners = winners.length > 0
    const displayItems = hasWinners ? winners : joiners

    return (
        <div className="w-full bg-primary/5 border-y border-white/5 py-3 overflow-hidden flex items-center relative group">
            {/* Label Badge - Fixed at start with high z-index and fade effect */}
            <div className="relative z-20 flex items-center">
                <div className="pl-4 pr-6 py-1.5 bg-gradient-to-r from-primary to-primary/80 text-black text-[10px] font-black uppercase tracking-widest rounded-r-full shadow-lg shadow-primary/20">
                    {hasWinners ? "🏆 Recent Winners" : "✨ Recent Activity"}
                </div>
                {/* Visual separator/fade */}
                <div className="absolute right-[-20px] top-0 bottom-0 w-8 bg-gradient-to-r from-primary/5 to-transparent z-10" />
            </div>

            {/* Marquee Container */}
            <div className="flex-1 overflow-hidden relative">
                <div className="flex gap-12 whitespace-nowrap animate-marquee py-1">
                    {displayItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-[11px] font-bold text-white/90 group-hover:text-white transition-colors">
                            {hasWinners ? (
                                <>
                                    <span className="text-primary text-sm shadow-glow">🏆</span>
                                    <span>{(item as Winner).name} won <span className="text-primary font-black">₹{(item as Winner).amount}</span></span>
                                </>
                            ) : (
                                <>
                                    <span className="text-blue-400 text-sm">👤</span>
                                    <span><span className="text-blue-300 font-extrabold">@{(item as any).username}</span> joined the platform</span>
                                </>
                            )}
                        </div>
                    ))}
                    {/* Repeat for looping */}
                    {displayItems.map((item, i) => (
                        <div key={`dup-${i}`} className="flex items-center gap-3 text-[11px] font-bold text-white/90 group-hover:text-white transition-colors">
                            {hasWinners ? (
                                <>
                                    <span className="text-primary text-sm shadow-glow">🏆</span>
                                    <span>{(item as Winner).name} won <span className="text-primary font-black">₹{(item as Winner).amount}</span></span>
                                </>
                            ) : (
                                <>
                                    <span className="text-blue-400 text-sm">👤</span>
                                    <span><span className="text-blue-300 font-extrabold">@{(item as any).username}</span> joined the platform</span>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Total Paid Section */}
            <div className="ml-auto px-6 shrink-0 items-center gap-2 hidden md:flex border-l border-white/10 h-full relative z-20 bg-black/40 backdrop-blur-sm">
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">Paid Out</span>
                <span className="text-success font-black text-xs">₹{totalWon.toLocaleString()}</span>
            </div>

            <style jsx>{`
                .animate-marquee {
                    display: flex;
                    animation: marquee 40s linear infinite;
                    width: max-content;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .shadow-glow {
                    filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.4));
                }
            `}</style>
        </div>
    )
}

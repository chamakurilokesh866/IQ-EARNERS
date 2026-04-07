"use client"
import { useRef, useState } from "react"
import { motion } from "framer-motion"
import html2canvas from "html2canvas"

interface BragCardProps {
    name: string
    tournament: string
    prize: string
    rank?: string
}

export default function BragCard({ name, tournament, prize, rank = "Winner" }: BragCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [generating, setGenerating] = useState(false)

    const downloadImage = async () => {
        if (!cardRef.current) return
        setGenerating(true)
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 3, // High quality
                useCORS: true,
                backgroundColor: "#0f172a"
            })
            const img = canvas.toDataURL("image/jpeg", 0.9)
            const link = document.createElement("a")
            link.href = img
            link.download = `IQ-Earners-Winner-${name.replace(/\s+/g, "_")}.jpg`
            link.click()
        } catch (err) {
            console.error("Failed to generate share image", err)
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-6">
            {/* The actual Card (hidden from normal flow if needed, but here we show it as a preview) */}
            <div className="relative group perspective-1000">
                <div 
                    ref={cardRef}
                    className="w-[320px] h-[568px] bg-[#0f172a] overflow-hidden rounded-[40px] border-[12px] border-white/5 relative shadow-2xl flex flex-col items-center justify-between py-12 px-8"
                >
                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
                        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[50%] bg-primary/20 blur-[100px] rounded-full" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[50%] bg-blue-600/20 blur-[100px] rounded-full" />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                    </div>

                    {/* Branding */}
                    <div className="z-10 text-center">
                        <div className="text-3xl font-black tracking-tighter text-white/90">
                            IQ <span className="text-primary italic">EARNERS</span>
                        </div>
                        <div className="text-[10px] uppercase font-black tracking-[0.4em] text-white/30 mt-1">
                            Official Victory Card
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="z-10 flex flex-col items-center text-center w-full">
                        <div className="w-24 h-24 mb-6 relative">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                            <div className="relative bg-navy-900 border-4 border-primary rounded-full w-full h-full flex items-center justify-center text-5xl">
                                🏆
                            </div>
                        </div>

                        <div className="text-sm uppercase font-black tracking-[0.2em] text-primary mb-2">
                            {rank}
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight mb-4 drop-shadow-lg">
                            {name}
                        </h2>
                        
                        <div className="w-12 h-1 bg-white/10 rounded-full mb-6" />

                        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Won</p>
                        <div className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_10px_20px_rgba(59,130,246,0.5)]">
                            {prize}
                        </div>
                    </div>

                    {/* Tournament Footer */}
                    <div className="z-10 text-center w-full">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl py-4 px-6 border border-white/10">
                            <div className="text-[9px] uppercase font-bold text-white/40 tracking-widest mb-1">Tournament</div>
                            <div className="text-sm font-bold text-white truncate">{tournament}</div>
                        </div>
                        <p className="text-[9px] font-medium text-white/20 mt-6 uppercase tracking-[0.3em]">
                            www.iqearners.online
                        </p>
                    </div>
                </div>
            </div>

            <button 
                onClick={downloadImage}
                disabled={generating}
                className="admin-btn admin-btn-primary w-full max-w-[320px] py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-transform"
            >
                {generating ? "Crafting Image..." : (
                    <>
                        <span>Download Share Card</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </>
                )}
            </button>
        </div>
    )
}

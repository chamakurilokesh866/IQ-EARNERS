"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface IntroContent {
    greeting: string
    tip: string
    quote: string
}

function TypewriterText({ text, speed = 30, delay = 0 }: { text: string; speed?: number; delay?: number }) {
    const [displayedText, setDisplayedText] = useState("")
    const [started, setStarted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setStarted(true), delay)
        return () => clearTimeout(timer)
    }, [delay])

    useEffect(() => {
        if (!started || !text) return

        let i = 0
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1))
            i++
            if (i >= text.length) clearInterval(interval)
        }, speed)

        return () => clearInterval(interval)
    }, [started, text, speed])

    return (
        <span className="relative inline-block w-full text-left">
            {/* Height stabilizer: full text but hidden */}
            <span className="invisible pointer-events-none block" aria-hidden="true">
                {text}
            </span>
            {/* Actual typing layer */}
            <span className="absolute top-0 left-0 w-full text-white/90">
                {displayedText}
                {started && displayedText.length < text.length && (
                    <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse vertical-middle" />
                )}
            </span>
        </span>
    )
}

export default function AIIntroContent() {
    const [data, setData] = useState<IntroContent | null>(null)
    const [loading, setLoading] = useState(true)
    const [visible, setVisible] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetch("/api/ai/intro-content", { cache: "no-store" })
            .then((r) => r.json())
            .then((j) => {
                if (j?.ok && j.data) {
                    setData(j.data)
                    setTimeout(() => setVisible(true), 300)
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading && !data) return (
        <div className="w-full max-w-xl mx-auto h-32 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    )

    if (!data) return null

    return (
        <section ref={containerRef} className="my-6 px-2 w-full flex justify-center">
            <AnimatePresence>
                {visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative group w-full max-w-2xl rounded-[2.5rem] overflow-hidden p-6 sm:p-8 bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl"
                    >
                        {/* Gradient Glow Overlay */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-[60px] pointer-events-none" />

                        <div className="relative z-10 w-full flex flex-col md:flex-row gap-8 items-center md:items-stretch">
                            
                            {/* Left Section: Greeting & Header */}
                            <div className="flex-[0.45] flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-8 w-full group">
                                <div className="flex items-center justify-between md:justify-start gap-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">AI Core Integration</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const textToCopy = `Greeting: ${data.greeting}\nStrategy: ${data.tip}\nMantra: ${data.quote}`;
                                            navigator.clipboard.writeText(textToCopy);
                                            const btn = document.getElementById("copy-ai-insight");
                                            if (btn) {
                                                btn.innerText = "COPIED";
                                                setTimeout(() => { if (btn) btn.innerText = "COPY"; }, 2000);
                                            }
                                        }}
                                        id="copy-ai-insight"
                                        className="md:hidden text-[9px] uppercase font-black text-white/40 hover:text-white bg-white/5 px-2 py-1 rounded-lg transition-all border border-white/5 active:scale-95"
                                    >
                                        COPY
                                    </button>
                                </div>
                                
                                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-4 min-h-[60px] tracking-tight">
                                    <TypewriterText text={data.greeting} speed={40} />
                                </h3>
                                
                                <button
                                    onClick={() => {
                                        const textToCopy = `Greeting: ${data.greeting}\nStrategy: ${data.tip}\nMantra: ${data.quote}`;
                                        navigator.clipboard.writeText(textToCopy);
                                        const btn = document.getElementById("copy-ai-insight-desktop");
                                        if (btn) {
                                            btn.innerText = "COPIED";
                                            setTimeout(() => { if (btn) btn.innerText = "COPY INSIGHT"; }, 2000);
                                        }
                                    }}
                                    id="copy-ai-insight-desktop"
                                    className="hidden md:inline-block mt-auto text-[9px] uppercase font-black text-white/30 tracking-[0.2em] hover:text-primary transition-all cursor-pointer text-left w-fit active:scale-95"
                                >
                                    COPY INSIGHT
                                </button>
                            </div>

                            {/* Right Section: Tip & Quote */}
                            <div className="flex-[0.55] flex flex-col justify-center gap-6 w-full md:pl-4">
                                <div className="text-left w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[12px] opacity-70 group-hover:scale-125 transition-transform">💡</span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/80">Strategy Matrix</span>
                                    </div>
                                    <p className="text-xs sm:text-[13px] text-white/60 leading-relaxed font-medium min-h-[40px]">
                                        <TypewriterText text={data.tip} speed={20} delay={1500} />
                                    </p>
                                </div>

                                <div className="text-left w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[12px] opacity-70 group-hover:scale-125 transition-transform">✨</span>
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/80">Platform Mantra</span>
                                    </div>
                                    <p className="text-xs sm:text-[13px] text-white/80 font-serif italic mb-1 min-h-[20px]">
                                        "<TypewriterText text={data.quote} speed={25} delay={3500} />"
                                    </p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    )
}

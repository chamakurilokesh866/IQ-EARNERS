"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, useAnimation, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

type Reward = {
    type: string
    value: number
    label: string
    scratchValue?: number
}

export type SpinAndWinProps = {
    quizId: string
    /** Omit outer section spacing (for modal / dashboard card) */
    embedded?: boolean
    /** z-index for scratch-card full-screen layer */
    scratchZIndex?: number
    /** Fired once after result is shown (non–scratch-card after delay; scratch after CONTINUE) */
    onFlowComplete?: () => void
    onSpinningChange?: (spinning: boolean) => void
    onResultChange?: (result: Reward | null) => void
    /** User cannot spin (e.g. already used); parent may close UI */
    onIneligible?: () => void
}

export function SpinAndWin({
    quizId,
    embedded,
    scratchZIndex = 100,
    onFlowComplete,
    onSpinningChange,
    onResultChange,
    onIneligible
}: SpinAndWinProps) {
    const [canSpin, setCanSpin] = useState<boolean | null>(null)
    const [spinning, setSpinning] = useState(false)
    const [result, setResult] = useState<Reward | null>(null)
    const [showScratchCard, setShowScratchCard] = useState(false)
    const [scratched, setScratched] = useState(false)
    const controls = useAnimation()
    const flowCompleteFired = useRef(false)
    const ineligibleFired = useRef(false)

    const REWARDS = [
        { label: "Bad Luck", color: "#6b7280", icon: "LOST" },
        { label: "₹1 Cash", color: "#10b981", icon: "MAX" },
        { label: "₹5 Cash", color: "#3b82f6", icon: "TOP" },
        { label: "₹10 Bonus", color: "#f59e0b", icon: "GOLD" },
        { label: "Scratch Card", color: "#ec4899", icon: "GIFT" }
    ]

    useEffect(() => {
        onSpinningChange?.(spinning)
    }, [spinning, onSpinningChange])

    useEffect(() => {
        onResultChange?.(result)
    }, [result, onResultChange])

    useEffect(() => {
        if (!quizId) return
        fetch(`/api/user/spin?quizId=${encodeURIComponent(quizId)}`, { credentials: "include" })
            .then((r) => r.json())
            .then((j) => setCanSpin(j.ok && j.canSpin))
            .catch(() => setCanSpin(false))
    }, [quizId])

    useEffect(() => {
        if (spinning) return
        if (canSpin !== false || result) return
        if (ineligibleFired.current) return
        ineligibleFired.current = true
        onIneligible?.()
    }, [canSpin, result, onIneligible, spinning])

    useEffect(() => {
        flowCompleteFired.current = false
        ineligibleFired.current = false
    }, [quizId])

    useEffect(() => {
        if (!onFlowComplete || !result || result.type === "scratch_card") return
        if (showScratchCard) return
        const t = window.setTimeout(() => {
            if (flowCompleteFired.current) return
            flowCompleteFired.current = true
            onFlowComplete()
        }, 2500)
        return () => window.clearTimeout(t)
    }, [result, showScratchCard, onFlowComplete])

    const handleScratchContinue = useCallback(() => {
        setShowScratchCard(false)
        if (flowCompleteFired.current) return
        flowCompleteFired.current = true
        onFlowComplete?.()
    }, [onFlowComplete])

    const handleSpin = async () => {
        if (spinning || !canSpin) return
        setSpinning(true)

        try {
            const res = await fetch("/api/user/spin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quizId }),
                credentials: "include"
            })
            const data = await res.json()
            if (!res.ok || !data.ok) throw new Error(data.error || "Failed")

            const targetIndex = data.reward.index
            const numSegments = REWARDS.length
            const segmentAngle = 360 / numSegments

            const extraRot = 360 * 5
            const targetRotation = extraRot + (360 - (targetIndex * segmentAngle))

            await controls.start({
                rotate: targetRotation,
                transition: { duration: 4, ease: [0.12, 0, 0, 1] }
            })

            setResult(data.reward)
            setSpinning(false)
            setCanSpin(false)

            if (data.reward.type !== "bad_luck") {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ["#F5B301", "#10B981", "#3B82F6"]
                })
            }

            if (data.reward.type === "scratch_card") {
                setTimeout(() => setShowScratchCard(true), 1500)
            }
        } catch (e) {
            console.error(e)
            setSpinning(false)
        }
    }

    // Avoid blanking the UI if canSpin flips false a tick before result is committed (e.g. React batching edge cases).
    if (canSpin === false && !result && !spinning) return null
    if (canSpin === null) {
        return embedded ? (
            <div className="animate-pulse h-24 rounded-2xl bg-white/5 w-full" />
        ) : (
            <div className="animate-pulse h-1 bg-white/5 w-full mt-4" />
        )
    }

    const rootClass = embedded
        ? "text-center animate-fade"
        : "mt-8 pt-8 border-t border-white/10 text-center animate-fade"

    return (
        <div className={rootClass}>
            <div className="mb-4">
                <h3 className="text-xl font-bold text-accent uppercase tracking-widest">Spin & Win Bonus!</h3>
                <p className="text-sm text-white/60">You won a free spin for completing the quiz!</p>
            </div>

            <div className="relative mx-auto w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[24px] border-t-white drop-shadow-[0_0_15px_rgba(255,255,255,0.7)] animate-pulse" />
                </div>

                <motion.div
                    animate={controls}
                    className="relative w-full h-full rounded-full border-4 border-white/20 overflow-hidden shadow-[0_0_50px_rgba(245,179,1,0.15)]"
                    style={{ background: "#1f2937" }}
                >
                    {REWARDS.map((r, i) => {
                        const rot = i * (360 / REWARDS.length)
                        return (
                            <div
                                key={i}
                                className="absolute inset-0 flex items-center justify-center"
                                style={{
                                    clipPath: `polygon(50% 50%, 0% 0%, 100% 0%)`,
                                    backgroundColor: r.color,
                                    transformOrigin: "50% 50%",
                                    transform: `rotate(${rot}deg)`,
                                    opacity: 0.9
                                }}
                            >
                                <div className="pb-24 flex flex-col items-center gap-1 -rotate-0">
                                    <span className="text-[10px] font-bold text-white/50">{r.icon}</span>
                                    <span className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-tighter whitespace-nowrap leading-none drop-shadow-md">
                                        {r.label.split(" ")[0]}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-4 border-navy-900 z-10 shadow-lg" />
                </motion.div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
                {!result && (
                    <button
                        type="button"
                        onClick={handleSpin}
                        disabled={spinning || canSpin === false}
                        className={`px-12 py-4 rounded-2xl bg-gradient-to-r from-accent to-amber-400 text-black font-extrabold text-lg shadow-[0_0_30px_rgba(245,179,1,0.3)] hover:scale-105 active:scale-95 transition-all w-full sm:w-auto uppercase tracking-wider ${spinning ? "opacity-50 cursor-wait" : ""}`}
                    >
                        {spinning ? "Spinning..." : "SPIN NOW"}
                    </button>
                )}

                {result && !showScratchCard && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`px-8 py-4 rounded-2xl ${result.type === "bad_luck" ? "bg-white/10" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"} flex items-center gap-3`}
                    >
                        <span className="text-xs font-bold uppercase tracking-widest">{result.type === "bad_luck" ? "MISS" : "WIN"}</span>
                        <div className="text-left">
                            <div className="font-bold">{result.label}</div>
                            {result.value > 0 && <div className="text-xs opacity-70">Credited to your referral wallet!</div>}
                        </div>
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {showScratchCard && (
                    <div
                        className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
                        style={{ zIndex: scratchZIndex }}
                    >
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="card max-w-sm w-full p-8 text-center relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/20 blur-3xl" />
                            <h2 className="text-2xl font-bold text-pink-500 mb-2">GIFT REVEALED!</h2>
                            <p className="text-white/60 text-sm mb-6 uppercase tracking-widest font-bold">Scratch to reveal your prize</p>

                            <div
                                role="button"
                                tabIndex={0}
                                className="relative w-full aspect-square bg-navy-800 rounded-3xl border-4 border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-crosshair group"
                                onClick={() => {
                                    if (scratched) return
                                    setScratched(true)
                                    confetti({
                                        particleCount: 150,
                                        spread: 100,
                                        origin: { y: 0.5 },
                                        colors: ["#ec4899", "#f472b6", "#ffffff"]
                                    })
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault()
                                        if (scratched) return
                                        setScratched(true)
                                        confetti({
                                            particleCount: 150,
                                            spread: 100,
                                            origin: { y: 0.5 },
                                            colors: ["#ec4899", "#f472b6", "#ffffff"]
                                        })
                                    }
                                }}
                            >
                                {!scratched ? (
                                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-indigo-600 flex items-center justify-center p-8 group-hover:scale-105 transition-transform duration-500">
                                        <div className="w-full h-full rounded-2xl border-4 border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                                            <span className="text-white text-5xl font-black opacity-20 rotate-12">SCRATCH ME</span>
                                        </div>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <span className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">BONUS</span>
                                        <div className="text-5xl font-black text-white">₹{result?.scratchValue}</div>
                                        <div className="text-pink-400 font-bold uppercase tracking-widest">Added to Wallet!</div>
                                    </motion.div>
                                )}
                            </div>

                            {scratched && (
                                <button
                                    type="button"
                                    onClick={handleScratchContinue}
                                    className="mt-8 w-full pill bg-white text-black py-4 font-bold hover:scale-105 transition-transform"
                                >
                                    CONTINUE
                                </button>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

const PENDING_SPIN_LS = "iq_pending_spin_quiz_id"

export function QuizSpinWheelOverlay({
    quizId,
    open,
    onDismissWithoutSpin,
    onCompleted,
    onIneligible
}: {
    quizId: string
    open: boolean
    onDismissWithoutSpin: () => void
    onCompleted: () => void
    onIneligible?: () => void
}) {
    const [spinning, setSpinning] = useState(false)
    const [hasResult, setHasResult] = useState(false)

    useEffect(() => {
        if (!open) {
            setHasResult(false)
            setSpinning(false)
        }
    }, [open])

    if (!open || !quizId) return null

    const canDismiss = !spinning || hasResult

    const requestClose = () => {
        if (!canDismiss) return
        if (hasResult) onCompleted()
        else onDismissWithoutSpin()
    }

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/55 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) requestClose()
            }}
            role="presentation"
        >
            <div
                className="relative w-full max-w-md rounded-[1.75rem] border border-white/15 bg-[#0b1222] shadow-[0_0_60px_rgba(0,0,0,0.45)] p-6 sm:p-8 max-h-[min(90vh,640px)] overflow-y-auto thin-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    disabled={!canDismiss}
                    onClick={requestClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-2xl border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-all text-lg font-bold leading-none flex items-center justify-center"
                    aria-label="Close spin wheel"
                >
                    ×
                </button>

                <SpinAndWin
                    quizId={quizId}
                    embedded
                    scratchZIndex={140}
                    onSpinningChange={setSpinning}
                    onResultChange={(r) => setHasResult(!!r)}
                    onFlowComplete={onCompleted}
                    onIneligible={() => {
                        onIneligible?.()
                        onCompleted()
                    }}
                />
            </div>
        </div>
    )
}

export { PENDING_SPIN_LS }

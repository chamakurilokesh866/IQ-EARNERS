"use client"

import { useEffect, useState } from "react"
import TransitionLink from "./TransitionLink"

interface VipModalProps {
    title?: string
    image?: string
    link?: string
    buttonText?: string
    onClose: () => void
}

export default function VipModal({
    title = "VIP Membership",
    image,
    link = "/tournaments",
    buttonText = "Become VIP Now",
    onClose
}: VipModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Prevent scrolling when modal is open
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = "unset"
        }
    }, [])

    if (!mounted) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 blur-overlay" onClick={onClose}>
            <div
                className="w-full max-w-sm flex flex-col modal-card-payment relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative background flare */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 blur-[100px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/20 blur-[100px] rounded-full" />

                {/* Close Button */}
                <button onClick={onClose} className="modal-close-btn">✕</button>

                {/* Content */}
                <div className="flex flex-col items-center p-6 text-center">
                    {image && (
                        <div className="w-full h-40 mb-6 rounded-2xl overflow-hidden border border-white/10 grayscale-[0.5] hover:grayscale-0 transition-all duration-700">
                            <img src={image} alt="VIP" className="w-full h-full object-cover" />
                        </div>
                    )}

                    <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
                    <p className="text-white/60 text-sm mb-8">
                        Unlock exclusive tournaments, higher prize pools, and premium features. Elevate your experience today!
                    </p>

                    <TransitionLink
                        href={link}
                        onClick={onClose}
                        className="modal-btn-primary !py-4 uppercase text-xs font-black tracking-[0.2em] shadow-xl shadow-primary/10"
                    >
                        {buttonText}
                    </TransitionLink>

                    <button
                        onClick={onClose}
                        className="text-xs text-white/40 hover:text-white transition-colors"
                    >
                        Not right now
                    </button>
                </div>
            </div>
        </div>
    )
}

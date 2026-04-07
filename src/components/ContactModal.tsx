"use client"

import dynamic from "next/dynamic"
const ContactForm = dynamic(() => import("./ContactForm"), { ssr: false })

interface ContactModalProps {
    onClose: () => void
}

export default function ContactModal({ onClose }: ContactModalProps) {
    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-navy-950/90 border border-white/10 shadow-2xl overflow-hidden glass-morphism animate-in fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📬</span>
                        <h2 className="text-lg font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Contact Support
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Form Container */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <ContactForm />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white/5 border-t border-white/10 text-center">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">
                        India&apos;s Premier Quiz Platform Support
                    </p>
                </div>
            </div>
        </div>
    )
}

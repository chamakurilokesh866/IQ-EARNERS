"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import logoPng from "../app/prizes/icon.png"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

const PAGES: { left: string; right: string }[] = [
  {
    left: "Welcome to IQ Earners",
    right: `India's Leading Competitive Quiz Platform (parent company: ${PARENT_COMPANY_NAME}). Play daily quizzes, compete in tournaments, and earn recognition. This manual covers rules, payment, and how to use the platform.`
  },
  {
    left: "Rules — Do's",
    right: "• Play fairly with one account per person\n• Provide accurate information during registration\n• Respect other players and maintain sportsmanship\n• Complete quizzes within the allotted time\n• Report bugs or suspicious activity\n• Read Terms & Privacy before use\n• Use platform for lawful purposes only"
  },
  {
    left: "Rules — Don'ts",
    right: "• No bots, scripts, or automated tools\n• No multiple accounts or impersonation\n• No sharing answers or collusion\n• No abusive language or harassment\n• No circumventing security\n• No reverse-engineering or scraping\n• No activity prohibited under Indian law"
  },
  {
    left: "How to Pay",
    right: "1. Click 'Participate Now' on the intro page\n2. Enter your phone number\n3. Choose: Pay via Cashfree (UPI/Card) OR Scan QR\n4. If Scan QR: Enter unique code, pay via UPI, upload screenshot\n5. If Pay Now: Complete payment on Cashfree\n6. Wait for admin verification (QR method)\n7. Set your username and get full access"
  },
  {
    left: "Payment Options",
    right: "• Pay Now: Uses Cashfree gateway (UPI, cards, netbanking)\n• Scan QR: Pay to our UPI ID with your unique code, then upload screenshot for manual verification. Admin approves within hours."
  },
  {
    left: "Quiz & Tournaments",
    right: "• Daily Quiz: New questions every day, 30 seconds per question\n• Tournaments: Timed events, join with entry fee\n• Leaderboard: See your rank, compete with others\n• Prizes: Win rewards, claim from your dashboard"
  },
  {
    left: "Grievance & Refund",
    right: "• Grievance: Contact us via Profile → Contact Us or email contact@iqearners.online. Our officer resolves issues within 15 days.\n• Refund: Entry fees are non-refundable once the tournament starts or access is granted. Exceptions made for technical errors."
  },
  {
    left: "Cookies & Data",
    right: "We use essential cookies for sessions, security, and analytics. Your data is protected under DPDP Act 2023. We never share your personal information with third parties without consent."
  },
  {
    left: "Legal & Support",
    right: `IQ Earners (${PARENT_COMPANY_NAME}) complies with IT Act 2000, DPDP Act 2023, Consumer Protection Act, and RBI guidelines. Violations may result in disqualification, suspension, or forfeiture. Official support: contact@iqearners.online.`
  }
]

const contentVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "15%" : "-15%",
    rotateY: direction > 0 ? 10 : -10,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    zIndex: 1,
    x: 0,
    rotateY: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? "15%" : "-15%",
    rotateY: direction < 0 ? -10 : 10,
    opacity: 0,
    scale: 0.95,
  })
}

export default function UserManualBook() {
  const [isOpen, setIsOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const totalPages = PAGES.length

  const openBook = () => {
    setPageIndex(0)
    setIsOpen(true)
  }

  const closeBook = () => {
    setIsOpen(false)
  }

  const nextPage = () => {
    if (pageIndex < totalPages - 1) {
      setDirection(1)
      setPageIndex((p) => p + 1)
    }
  }

  const prevPage = () => {
    if (pageIndex > 0) {
      setDirection(-1)
      setPageIndex((p) => p - 1)
    }
  }

  return (
    <div className="mt-4 w-full flex justify-center pb-4" style={{ perspective: 1800, minHeight: 200 }}>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* Closed Premium Book Cover */
          <motion.div
            key="closed"
            onClick={openBook}
            className="group relative cursor-pointer focus:outline-none"
            initial={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, rotateY: -15 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="relative w-36 h-48 sm:w-44 sm:h-60 rounded-r-xl rounded-l-sm shadow-2xl overflow-hidden transition-transform duration-300"
              animate={{
                y: [0, -8, 0],
                boxShadow: [
                  "10px 20px 30px rgba(0,0,0,0.5)",
                  "15px 25px 40px rgba(255,160,0,0.15)",
                  "10px 20px 30px rgba(0,0,0,0.5)"
                ]
              }}
              transition={{
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
              style={{
                background: "linear-gradient(135deg, #2d1810 0%, #1a0f0a 100%)", // Rich dark leather
                transformStyle: "preserve-3d",
              }}
              whileHover={{ rotateY: -8, scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 border border-white/5 rounded-r-2xl rounded-l-md" />

              {/* Leather texture overlay */}
              <div
                className="absolute inset-0 opacity-20 mix-blend-overlay"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}
              />

              {/* Spine edge highlight */}
              <div
                className="absolute left-0 top-0 bottom-0 w-8"
                style={{
                  background: "linear-gradient(to right, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)",
                  borderLeft: "2px solid rgba(0,0,0,0.9)",
                  boxShadow: "inset -2px 0 5px rgba(0,0,0,0.5)"
                }}
              />

              {/* Book content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 text-center">
                <div className="p-1.5 border border-amber-500/30 rounded-full mb-1 sm:mb-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] bg-black/20">
                  <Image src={logoPng} alt="Logo" width={32} height={32} className="drop-shadow-lg rounded-full sm:w-[40px] sm:h-[40px]" />
                </div>
                <span className="text-[9px] sm:text-xs font-serif text-amber-500/80 uppercase tracking-[0.2em] mb-1">
                  IQ Earners
                </span>
                <div className="w-10 h-px bg-amber-600/50 mb-2 sm:mb-3" />
                <h3 className="text-lg sm:text-2xl font-serif font-black text-amber-400 uppercase tracking-widest leading-[1.1] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  User<br />Manual
                </h3>
                <span className="absolute bottom-4 px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] text-amber-400/70 border border-amber-500/20 rounded-full uppercase tracking-wider animate-pulse bg-black/30">
                  Tap to Open
                </span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* Open Realistic Book Spread — Compact */
          <motion.div
            key="open"
            initial={{ opacity: 0, scale: 0.8, rotateX: 10 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md shadow-2xl mx-auto"
            style={{ perspective: 2000 }}
          >
            {/* Paper Layers effect at the bottom */}
            <div className="absolute -bottom-1 left-2 right-2 h-1.5 bg-[#d7cebd] rounded-b-md shadow-md z-0" />
            <div className="absolute -bottom-2 left-4 right-4 h-1.5 bg-[#c6bdac] rounded-b-md shadow-md z-0" />

            {/* Main Book Container */}
            <div
              className="relative w-full rounded-md sm:rounded-lg overflow-hidden flex flex-col z-10"
              style={{
                height: 'clamp(280px, 48vh, 340px)',
                backgroundColor: "#f4f1ea",
                backgroundImage: "radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, rgba(244,241,234,1) 100%)",
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.05), 0 25px 50px -12px rgba(0,0,0,0.5)"
              }}
            >
              {/* Paper Texture Overlay */}
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 mix-blend-multiply"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }}
              />

              {/* Spine Shadow */}
              <div className="hidden sm:block absolute top-0 bottom-0 left-[50%] w-12 -ml-6 pointer-events-none z-40 opacity-70 mix-blend-multiply"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.05) 70%, transparent 100%)" }} />
              <div className="hidden sm:block absolute top-0 bottom-0 left-[50%] w-px bg-black/5 pointer-events-none z-40" />

              {/* Close Button */}
              <button
                type="button"
                onClick={closeBook}
                className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 w-7 h-7 flex items-center justify-center rounded-full bg-[#ebdcc2] text-[#5a4d41] hover:bg-[#dfcdb0] hover:text-[#3a2d23] transition-colors z-50 shadow-sm border border-[#d0c7b5]/50 focus:outline-none text-xs"
                aria-label="Close Book"
              >
                ✕
              </button>

              {/* Content Area */}
              <div className="relative w-full flex-1 flex flex-col z-20 pb-11 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pageIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="flex-1 flex flex-col sm:flex-row w-full py-3 px-3 sm:py-5 sm:px-6 overflow-hidden"
                  >
                    {/* Left Page (Title & Logo) */}
                    <div className="w-full sm:w-[40%] flex flex-col justify-start border-b sm:border-b-0 sm:border-r border-[#d0c7b5]/40 pb-2 sm:pb-0 sm:pr-5 shrink-0">
                      <div className="mb-1 sm:mb-4">
                        <div className="opacity-20 mix-blend-multiply grayscale rounded-full overflow-hidden w-6 h-6 sm:w-8 sm:h-8">
                          <Image src={logoPng} alt="IQ Earners Logo" width={32} height={32} className="rounded-full w-full h-full" />
                        </div>
                      </div>

                      <h3 className="text-sm sm:text-lg lg:text-xl font-serif font-bold text-[#3a2d23] uppercase tracking-wider leading-tight mb-1.5 sm:mb-3 drop-shadow-sm">
                        {PAGES[pageIndex].left}
                      </h3>
                      <div className="h-0.5 w-8 sm:w-12 bg-amber-700/30 mb-1 sm:mb-2" />
                    </div>

                    {/* Right Page (Content text) — scrollable for long content */}
                    <div className="w-full sm:w-[60%] flex flex-col justify-start pt-2 sm:pt-0 sm:pl-5 overflow-hidden min-h-0">
                      <div className="relative flex-1 flex flex-col overflow-y-auto pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                        {/* Decorative corner marks */}
                        <div className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-3 h-3 sm:w-4 sm:h-4 border-t border-l border-[#d0c7b5]/60 opacity-60 pointer-events-none" />

                        <p className="text-[10px] sm:text-xs lg:text-sm text-[#4a3d31] font-serif whitespace-pre-line leading-[1.65] sm:leading-relaxed text-left">
                          {pageIndex === 0 && (
                            <span className="float-left text-2xl sm:text-3xl font-serif text-amber-800/80 mr-1.5 sm:mr-2 leading-none">
                              {PAGES[pageIndex].right.charAt(0)}
                            </span>
                          )}
                          {pageIndex === 0 ? PAGES[pageIndex].right.slice(1) : PAGES[pageIndex].right}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Pagination Footer — Compact */}
              <div className="absolute bottom-0 left-0 right-0 h-11 flex justify-between items-center px-4 sm:px-8 z-50 bg-[#f4f1ea]/90 backdrop-blur-sm border-t border-[#d0c7b5]/30">
                <button
                  type="button"
                  onClick={prevPage}
                  disabled={pageIndex === 0}
                  className="px-2.5 py-1.5 rounded-md text-xs font-serif text-[#5a4d41] hover:text-[#2a1d13] hover:bg-[#ebdcc2]/50 disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-1.5 focus:outline-none"
                >
                  <span className="text-sm">←</span> <span className="hidden sm:inline">Previous</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-serif text-[#8a7d71] tracking-widest uppercase">
                    Page {pageIndex + 1} of {totalPages}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={nextPage}
                  disabled={pageIndex === totalPages - 1}
                  className="px-2.5 py-1.5 rounded-md text-xs font-serif text-[#5a4d41] hover:text-[#2a1d13] hover:bg-[#ebdcc2]/50 disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center gap-1.5 focus:outline-none"
                >
                  <span className="hidden sm:inline">Next</span> <span className="text-sm">→</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

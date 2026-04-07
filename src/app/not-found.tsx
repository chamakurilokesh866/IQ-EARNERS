"use client"

import TokenLink from "@/components/TokenLink"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b1220] px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="card max-w-lg w-full p-10 text-center relative z-10 border-white/10 bg-black/40 backdrop-blur-3xl shadow-2xl animate-slide-up">
        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-primary to-accent mb-4 tracking-tighter">404</div>

        <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl mb-6">
          🔎
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Oops! Lost in Space?</h1>
        <p className="text-white/60 mb-8 max-w-xs mx-auto">
          The page you are looking for doesn&apos;t exist or the link you used has expired.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <TokenLink
            href="/home"
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
          >
            Back to Home
          </TokenLink>
          <a
            href="/"
            className="px-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
          >
            Go to Start
          </a>
        </div>
      </div>

      <div className="mt-12 text-white/20 text-sm font-medium tracking-widest uppercase text-center">
        IQ Earners · {PARENT_COMPANY_NAME}
      </div>
    </div>
  )
}

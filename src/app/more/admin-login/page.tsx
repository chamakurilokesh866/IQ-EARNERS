"use client"

import Navbar from "../../../components/Navbar"
import LoginModal from "../../../components/LoginModal"
import { useState } from "react"
import TransitionLink from "../../../components/TransitionLink"
import { motion } from "framer-motion"

export default function Page() {
  const [showLogin, setShowLogin] = useState(true)

  return (
    <main className="min-h-screen bg-transparent text-slate-100">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-center max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="ui-aurora-ring w-full max-w-md"
          >
            <div className="ui-aurora-ring-inner p-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/25 text-lg font-black text-mint mb-4 border border-white/10">
                AD
              </div>
              <div className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Admin Access
              </div>
              <p className="mt-2 text-sm text-navy-300 leading-relaxed">
                Admins sign in with their admin username through the main login.
              </p>
              <button
                type="button"
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-3.5 font-bold text-white shadow-lg shadow-primary/25 hover:brightness-110 transition-all active:scale-[0.98]"
                onClick={() => setShowLogin(true)}
              >
                Log in with Admin Username
              </button>
              <TransitionLink
                href="/intro"
                className="mt-4 inline-block text-sm text-accent/90 hover:text-mint transition-colors"
              >
                ← Back to Intro
              </TransitionLink>
            </div>
          </motion.div>
        </div>
      </section>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </main>
  )
}

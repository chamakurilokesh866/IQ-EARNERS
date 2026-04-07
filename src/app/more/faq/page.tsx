"use client"

import Navbar from "../../../components/Navbar"
import TransitionLink from "../../../components/TransitionLink"
import { motion } from "framer-motion"
import { useState } from "react"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

const FAQ_DATA = [
  {
    category: "General",
    questions: [
      {
        q: "What is IQ Earners?",
        a: `IQ Earners is a premium, skill-based knowledge platform (parent company: ${PARENT_COMPANY_NAME}) where users can test their intellect, compete in tournaments, and earn rewards based on their quiz performance.`
      },
      {
        q: "Is it legal to play in India?",
        a: "Yes. IQ Earners operates as a platform for 'Games of Skill'. Under Indian law, skill-based engagement is legally permissible. We comply with the IT Act 2000 and Consumer Protection Act 2019."
      },
      {
        q: "Who can participate?",
        a: "Participation is open to individuals aged 18 and above. Users from states where skill-based gaming is restricted (e.g., Andhra Pradesh, Assam, Nagaland, Odisha, Sikkim, Telangana) are advised to check local regulations."
      }
    ]
  },
  {
    category: "Quiz & Rewards",
    questions: [
      {
        q: "How do I earn rewards?",
        a: "Rewards are earned by achieving high scores in Daily Quizzes and participating in Live Mega Tournaments. Your accuracy and speed determine your rank on the leaderboard."
      },
      {
        q: "What are Live Mega Tournaments?",
        a: "These are scheduled events with significant prize pools. Participants compete simultaneously at a set time, and top performers share the rewards."
      },
      {
        q: "When can I withdraw my earnings?",
        a: "Withdrawals can be requested once you reach the minimum threshold. Payouts are typically processed to your linked UPI id within 24-48 hours after verification."
      }
    ]
  },
  {
    category: "Security & Fair Play",
    questions: [
      {
        q: "Is my data secure?",
        a: "Absolutely. We are DPDP 2023 compliant. Your personal and financial data is encrypted and managed through secure gateways. We do not sell user data."
      },
      {
        q: "What happens if someone cheats?",
        a: "We have zero tolerance for unfair play. Our proprietary algorithms detect bots, multiple accounts, and external assistance. Violators face immediate permanent bans and forfeiture of earnings."
      }
    ]
  }
]

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<string | null>("General-0")

  return (
    <main className="min-h-screen app-page-surface text-white">
      <Navbar />
      
      <div className="relative overflow-hidden pt-20 pb-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        
        <section className="mx-auto max-w-4xl px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">Support & FAQ</h1>
            <p className="text-white/40 max-w-xl mx-auto font-medium">
              Everything you need to know about IQ Earners ({PARENT_COMPANY_NAME}). Can&apos;t find an answer?{" "}
              Contact us at <span className="text-primary">iqearnersteam@gmail.com</span>
            </p>
          </motion.div>

          <div className="space-y-12">
            {FAQ_DATA.map((cat, catIdx) => (
              <motion.div
                key={cat.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.1 }}
              >
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary/60 mb-6 flex items-center gap-4">
                  {cat.category}
                  <div className="flex-1 h-px bg-white/5" />
                </h2>
                
                <div className="space-y-4">
                  {cat.questions.map((item, qIdx) => {
                    const id = `${cat.category}-${qIdx}`
                    const isOpen = openIdx === id
                    return (
                      <div 
                        key={id} 
                        className={`rounded-2xl border transition-all duration-300 ${isOpen ? "bg-white/[0.04] border-white/20 shadow-xl" : "bg-white/[0.02] border-white/5 hover:border-white/10"}`}
                      >
                        <button
                          onClick={() => setOpenIdx(isOpen ? null : id)}
                          className="w-full text-left p-6 flex items-center justify-between gap-4"
                        >
                          <span className={`font-bold transition-colors ${isOpen ? "text-white" : "text-white/70"}`}>
                            {item.q}
                          </span>
                          <span className={`text-xl transition-transform duration-300 ${isOpen ? "rotate-45 text-primary" : "text-white/20"}`}>
                            +
                          </span>
                        </button>
                        
                        {isOpen && (
                          <div className="px-6 pb-6 text-sm text-white/50 leading-relaxed animate-fade-in">
                            {item.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-20 p-10 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
            <h3 className="text-2xl font-black mb-2">Still have questions?</h3>
            <p className="text-white/40 text-sm mb-8">Out support team typically responds within 4 hours.</p>
            <div className="flex flex-wrap justify-center gap-4">
                <a href="mailto:iqearnersteam@gmail.com" className="px-8 py-3 rounded-xl bg-primary text-white font-black hover:bg-primary/80 transition-all">Email Support</a>
                <TransitionLink href="/home" className="px-8 py-3 rounded-xl bg-white/5 text-white/70 font-black border border-white/10 hover:bg-white/10 transition-all">Back to Dashboard</TransitionLink>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-3 opacity-30 text-[10px] uppercase font-black tracking-widest">
            <TransitionLink href="/more/terms" className="hover:text-white transition-colors">Terms of Service</TransitionLink>
            <TransitionLink href="/more/privacy" className="hover:text-white transition-colors">Privacy Policy</TransitionLink>
            <TransitionLink href="/more/rules" className="hover:text-white transition-colors">Rules</TransitionLink>
          </div>
        </section>
      </div>
    </main>
  )
}

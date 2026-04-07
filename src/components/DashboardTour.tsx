"use client"

import { useState } from "react"

const TOUR_STEPS = [
  { id: "welcome", title: "Welcome to your Dashboard", body: "Here you can track quizzes, earnings, achievements, and more." },
  { id: "quick", title: "Quick Actions", body: "Take Daily Quiz, Join Tournament, View Leaderboard, or Browse Prizes." },
  { id: "tabs", title: "Tabs", body: "Switch between Overview, Achievements, Certificates, Payments, and Referrals." },
  { id: "referrals", title: "Refer & Earn", body: "Share your referral link to earn. Each friend who pays adds to your wallet and the quiz launch progress!" }
]

export default function DashboardTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const s = TOUR_STEPS[step]
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-900/90 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 max-w-sm w-full rounded-2xl bg-navy-800 border border-navy-600 shadow-2xl p-6 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎯</div>
          <h3 className="text-lg font-bold text-white">{s.title}</h3>
          <p className="mt-2 text-sm text-navy-300">{s.body}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="pill bg-navy-700 flex-1 py-2.5"
          >
            Skip
          </button>
          {step < TOUR_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((i) => i + 1)}
              className="pill bg-primary flex-1 py-2.5"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="pill bg-primary flex-1 py-2.5"
            >
              Got it
            </button>
          )}
        </div>
        <div className="flex justify-center gap-1 mt-4">
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${i === step ? "bg-primary" : "bg-navy-600"}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** API response shapes and shared types */

export type ApiResponse<T> = { ok: boolean; data?: T; error?: string }

export type UserStatsData = {
  streak: number
  achievements: string[]
  history: Array<{ date: string; score: number; total: number; totalTimeSeconds?: number }>
}

export type PaymentItem = {
  id: string
  amount: number
  status: string
  gateway?: string
  created_at?: string | number
  profileId?: string
  meta?: Record<string, unknown>
}

export type ActivityItem = {
  type: "payment" | "quiz" | "enrollment" | "referral"
  title: string
  meta?: string
  when: string
  whenTs: number
  status?: string
  points?: string
}

export type ReferralItem = {
  id: string
  referrerUid?: string
  referrerUsername?: string
  referredUid?: string
  referredUsername?: string
  status: string
  amount?: number
}

export type ProfileData = {
  uid?: string
  username?: string
  wallet?: number
  referralCode?: string
  country?: string
  memberId?: string
}

export type CertificateItem = {
  tournamentId: string
  tournamentTitle: string
  score: number
  total?: number
  type: "1st" | "runner_up" | "participation"
}

export type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correctAnswer: string
  explanation?: string
}

export type QuizResultRow = {
  question: string
  correctAnswer: string
  userAnswer: string
  correct: boolean
  timeSeconds: number
  explanation?: string
}

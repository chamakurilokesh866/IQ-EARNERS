import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Quiz Prizes - Win Rewards",
  description:
    "Win quiz prizes. Claim rewards from tournaments & daily quizzes. See available prizes and how to win.",
  alternates: { canonical: `${SITE_URL}/prizes` },
  openGraph: {
    title: "Quiz Prizes - Win Rewards | IQ Earners",
    url: `${SITE_URL}/prizes`,
  },
}

export default function PrizesLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from "next"
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE_URL,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  DESCRIPTIONS,
  PAGE_KEYWORDS,
} from "@/lib/seo"

export const metadata: Metadata = {
  title: "Quiz Leaderboard | Top GK Quiz Rankers India – IQ Earners",
  description: DESCRIPTIONS.leaderboard,
  keywords: PAGE_KEYWORDS.leaderboard,
  alternates: { canonical: `${SITE_URL}/leaderboard` },
  openGraph: {
    title: "Online Quiz Leaderboard | Top Rankers India – IQ Earners",
    description: DESCRIPTIONS.leaderboard,
    url: `${SITE_URL}/leaderboard`,
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE_URL,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: "IQ Earners Quiz Leaderboard",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Quiz Leaderboard India | IQ Earners",
    description: DESCRIPTIONS.leaderboard,
    images: [DEFAULT_OG_IMAGE_URL],
  },
  robots: { index: true, follow: true },
}

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children
}

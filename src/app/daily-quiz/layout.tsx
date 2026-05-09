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
  title: "Daily GK Quiz Online | New Questions Every Day – IQ Earners",
  description: DESCRIPTIONS.dailyQuiz,
  keywords: PAGE_KEYWORDS.dailyQuiz,
  alternates: { canonical: `${SITE_URL}/daily-quiz` },
  openGraph: {
    title: "Daily GK Quiz Online | New Questions Every Day – IQ Earners",
    description: DESCRIPTIONS.dailyQuiz,
    url: `${SITE_URL}/daily-quiz`,
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE_URL,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: "Daily GK Quiz – IQ Earners",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Daily GK Quiz | Play Now – IQ Earners",
    description: DESCRIPTIONS.dailyQuiz,
    images: [DEFAULT_OG_IMAGE_URL],
  },
  robots: { index: true, follow: true },
}

export default function DailyQuizLayout({ children }: { children: React.ReactNode }) {
  return children
}

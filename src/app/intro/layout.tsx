import type { Metadata } from "next"
import { SITE_URL, SITE_NAME, PARENT_COMPANY_NAME, DEFAULT_OG_IMAGE_URL, DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Online Quiz Platform India | Daily Quizzes, Tournaments & Prizes",
  description: `${DESCRIPTIONS.intro} Parent company: ${PARENT_COMPANY_NAME}.`,
  keywords: PAGE_KEYWORDS.intro,
  alternates: { canonical: `${SITE_URL}/intro` },
  openGraph: {
    title: "Online Quiz Platform India | Daily Quizzes, GK & Win Prizes",
    description: DESCRIPTIONS.intro,
    url: `${SITE_URL}/intro`,
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE_URL,
        width: 512,
        height: 512,
        alt: "IQ Earners – Online Quiz India",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Online Quiz India | Win Real Prizes – IQ Earners",
    description: DESCRIPTIONS.intro,
    images: [DEFAULT_OG_IMAGE_URL],
  },
  robots: { index: true, follow: true },
}

export default function IntroLayout({ children }: { children: React.ReactNode }) {
  return children
}

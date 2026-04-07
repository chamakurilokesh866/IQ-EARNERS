import type { Metadata } from "next"
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE_URL, DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Online Quiz Tournaments India | Win Cash Prizes – IQ Earners",
  description: DESCRIPTIONS.tournaments,
  keywords: PAGE_KEYWORDS.tournaments,
  alternates: { canonical: `${SITE_URL}/tournaments` },
  openGraph: {
    title: "Online Quiz Tournaments India | Compete & Win Cash Prizes",
    description: DESCRIPTIONS.tournaments,
    url: `${SITE_URL}/tournaments`,
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE_URL,
        width: 512,
        height: 512,
        alt: "Quiz Tournaments India – IQ Earners",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiz Tournaments India | Win Cash Prizes – IQ Earners",
    description: DESCRIPTIONS.tournaments,
    images: [DEFAULT_OG_IMAGE_URL],
  },
  robots: { index: true, follow: true },
}

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from "next"
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE_URL, DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/seo"

export const metadata: Metadata = {
  title: "My Quiz Dashboard | Daily Quiz, Leaderboard & Tournaments",
  description: DESCRIPTIONS.home,
  keywords: PAGE_KEYWORDS.home,
  alternates: { canonical: `${SITE_URL}/home` },
  openGraph: {
    title: "My Quiz Dashboard | IQ Earners – Daily Quiz & Tournaments",
    description: DESCRIPTIONS.home,
    url: `${SITE_URL}/home`,
    siteName: SITE_NAME,
    images: [{ url: DEFAULT_OG_IMAGE_URL, width: 512, height: 512, alt: "IQ Earners Dashboard" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "My Quiz Dashboard | IQ Earners",
    description: DESCRIPTIONS.home,
    images: [DEFAULT_OG_IMAGE_URL],
  },
  robots: { index: false, follow: false }, // Dashboard is private – don't index
}

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children
}

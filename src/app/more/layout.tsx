import type { Metadata } from "next"
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE_URL, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from "@/lib/seo"

export const metadata: Metadata = {
  title: {
    default: `Support Center | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Support center for IQ Earners: FAQs, legal policies, user rights, and organization integration guidance.",
  alternates: { canonical: `${SITE_URL}/more` },
  openGraph: {
    title: `Support Center | ${SITE_NAME}`,
    description: "FAQs, policies, and integration help in one place.",
    url: `${SITE_URL}/more`,
    siteName: SITE_NAME,
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE_URL, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: `${SITE_NAME} support center` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Support Center | ${SITE_NAME}`,
    description: "Support docs, legal pages, and API guidance.",
    images: [DEFAULT_OG_IMAGE_URL],
  },
}

export default function MoreLayout({ children }: { children: React.ReactNode }) {
  return children
}

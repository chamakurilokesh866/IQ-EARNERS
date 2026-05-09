import type { Metadata } from "next"
import { SITE_NAME, SITE_URL, DEFAULT_OG_IMAGE_URL, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } from "@/lib/seo"

export const metadata: Metadata = {
  title: "FAQ | Quiz Rules, Rewards, Security",
  description:
    "Frequently asked questions about IQ Earners: legality, rewards, withdrawals, anti-cheat policy, and data security.",
  alternates: { canonical: `${SITE_URL}/more/faq` },
  openGraph: {
    title: `FAQ | ${SITE_NAME}`,
    description: "Answers for gameplay, rewards, withdrawals, and platform security.",
    url: `${SITE_URL}/more/faq`,
    siteName: SITE_NAME,
    type: "article",
    images: [{ url: DEFAULT_OG_IMAGE_URL, width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, alt: `${SITE_NAME} FAQ` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `FAQ | ${SITE_NAME}`,
    description: "Questions and answers about quizzes, payouts, and fair play.",
    images: [DEFAULT_OG_IMAGE_URL],
  },
}

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is IQ Earners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IQ Earners is a skill-based quiz platform where users can compete in quizzes and tournaments and earn rewards based on performance.",
        },
      },
      {
        "@type": "Question",
        name: "Is it legal to play in India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IQ Earners operates as a game-of-skill platform and follows applicable Indian regulations.",
        },
      },
      {
        "@type": "Question",
        name: "How are withdrawals processed?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Withdrawals are processed after verification and typically completed via linked UPI within 24-48 hours.",
        },
      },
      {
        "@type": "Question",
        name: "How does anti-cheat work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The platform monitors suspicious behavior and can flag or block unfair activity to protect fair play.",
        },
      },
    ],
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "More", item: `${SITE_URL}/more` },
      { "@type": "ListItem", position: 3, name: "FAQ", item: `${SITE_URL}/more/faq` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  )
}

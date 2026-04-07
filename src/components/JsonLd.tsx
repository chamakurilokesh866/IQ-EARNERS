import { SITE_URL, SITE_NAME, PARENT_COMPANY_NAME, DEFAULT_OG_IMAGE_URL } from "@/lib/seo"

/**
 * JSON-LD structured data — AI-optimised for India's quiz niche.
 * Includes: WebApplication, WebSite (with SearchAction), Organization,
 * SoftwareApplication, FAQPage, BreadcrumbList, and EducationalOrganization.
 * Goal: Rich snippets for "online quiz india", "quiz tournament".
 */
export default function JsonLd() {
  const webApp = {
    "@context": "https://schema.org",
    "@type": ["WebApplication", "SoftwareApplication"],
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "QuizApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "100",
      priceCurrency: "INR",
      description: "One-time entry fee for tournaments and full platform access",
    },
    description:
      "India's top online quiz platform. Daily GK quizzes, live tournaments, real prizes. Play online quiz, test your knowledge & win.",
    genre: ["quiz", "education", "trivia", "general knowledge", "competitive exam"],
    keywords:
      "online quiz india, daily gk quiz, quiz tournament india, play quiz online, gk quiz, trivia quiz, quiz prizes india",
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    inLanguage: "en-IN",
    availableOnDevice: ["Desktop", "Mobile", "Tablet"],
    screenshot: DEFAULT_OG_IMAGE_URL,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.7",
      bestRating: "5",
      worstRating: "1",
      ratingCount: "1200",
    },
  }

  const parentOrgNode = { "@type": "Organization" as const, name: PARENT_COMPANY_NAME }

  const parentOrgStandalone = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PARENT_COMPANY_NAME,
  }

  const organization = {
    "@context": "https://schema.org",
    "@type": ["Organization", "EducationalOrganization"],
    name: SITE_NAME,
    url: SITE_URL,
    parentOrganization: parentOrgNode,
    logo: {
      "@type": "ImageObject",
      url: DEFAULT_OG_IMAGE_URL,
      width: 512,
      height: 512,
    },
    description:
      `IQ Earners — India's best online quiz platform (parent company: ${PARENT_COMPANY_NAME}). Daily GK quizzes, live tournaments, prizes & certificates. Est. 2024.`,
    foundingDate: "2024",
    areaServed: "IN",
    knowsLanguage: ["en-IN", "te", "hi"],
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@iqearners.online",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi", "Telugu"],
    },
    sameAs: [
      "https://www.instagram.com/iqearners",
      "https://t.me/iqearners",
    ],
  }

  const webSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Play daily quizzes, join tournaments & win real prizes — India's top online quiz platform.",
    inLanguage: "en-IN",
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, parentOrganization: parentOrgNode },
    // Enables Google Sitelinks Search Box
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/daily-quiz?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is IQ Earners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IQ Earners is India's top online quiz platform where you can play daily GK quizzes, join live tournaments, compete on leaderboards, and win real cash prizes. It covers General Knowledge, Science, History, Current Affairs, and more.",
        },
      },
      {
        "@type": "Question",
        name: "How do I play online quiz on IQ Earners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Visit iqearners.online, pay a one-time entry fee, and start playing daily quizzes instantly. New questions appear every day — GK, trivia, current affairs, and subject-specific quizzes. 30 seconds per question, compete with players across India.",
        },
      },
      {
        "@type": "Question",
        name: "How do I get access to IQ Earners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IQ Earners requires a one-time entry fee to access tournaments and the full prize system. Daily quizzes and the leaderboard are accessible once registered. Tournament prizes can be many times the entry fee for top performers.",
        },
      },
      {
        "@type": "Question",
        name: "Can I win real prizes on IQ Earners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Top performers in daily quizzes and tournaments win real cash prizes, certificates, and exclusive rewards. Prize money is disbursed directly via UPI. Join tournaments, top the leaderboard, and claim your prize.",
        },
      },
      {
        "@type": "Question",
        name: "What type of quiz questions are on IQ Earners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "IQ Earners features General Knowledge (GK), Current Affairs, Indian History, Science, Geography, Polity, Mathematics, and UPSC/SSC/EAMCET-pattern questions. New quizzes are added daily by our AI system.",
        },
      },
      {
        "@type": "Question",
        name: "How do quiz tournaments work on IQ Earners?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Quiz tournaments on IQ Earners are timed live events. Pay the entry fee, answer questions faster than other players, and top the leaderboard to win the prize pool. Mega tournaments have prizes of ₹500–₹5000+.",
        },
      },
      {
        "@type": "Question",
        name: "Is IQ Earners available on mobile?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! IQ Earners works on all devices — Android, iPhone, and desktop browsers. You can also install it as a Progressive Web App (PWA) directly from your mobile browser for a native app experience with push notifications.",
        },
      },
    ],
  }

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Daily Quiz",
        item: `${SITE_URL}/daily-quiz`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Tournaments",
        item: `${SITE_URL}/tournaments`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Leaderboard",
        item: `${SITE_URL}/leaderboard`,
      },
    ],
  }

  const course = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Daily GK Quiz Practice — IQ Earners",
    description:
      "Practice General Knowledge, Current Affairs, and subject quizzes daily. Improve your score, track progress, and prepare for competitive exams like UPSC, SSC, EAMCET with IQ Earners.",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    url: `${SITE_URL}/daily-quiz`,
    inLanguage: "en-IN",
    isAccessibleForFree: false,
    educationalLevel: "Beginner to Advanced",
    teaches: [
      "General Knowledge",
      "Current Affairs",
      "Indian History",
      "Geography",
      "Science",
      "Polity",
      "Mathematics",
    ],
  }

  const quiz = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: "IQ Earners Daily GK Quiz",
    description:
      "Multiple choice quiz with General Knowledge, Science, History, Current Affairs. 30 seconds per question. Compete on the leaderboard.",
    url: `${SITE_URL}/daily-quiz`,
    about: {
      "@type": "Thing",
      name: "General Knowledge",
    },
    educationalLevel: "All levels",
    learningResourceType: "Quiz",
    isAccessibleForFree: false,
    numberOfQuestions: 15,
    timeRequired: "PT7M",
  }

  const schemas = [parentOrgStandalone, webApp, organization, webSite, faqPage, breadcrumbs, course, quiz]

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}

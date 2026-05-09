/**
 * Central SEO config: base URL, site name, and shared metadata.
 * AI-optimised for India's competitive quiz niche — March 2026.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "https://www.iqearners.online"

export const SITE_NAME = "IQ Earners"
/** Public support & integrations inbox (mailto, legal, AI prompts, structured data) */
export const SUPPORT_EMAIL = "iqearnersteam@gmail.com"
/** Parent / holding company — shown in footers, legal copy, and structured data */
export const PARENT_COMPANY_NAME = "SynKora"
export const SITE_TAGLINE = "India's Best Online Quiz Platform"

/** Site logo (SVG) — browser tab, PWA, JSON-LD Organization.logo */
export const SITE_LOGO_PATH = "/logo.svg"
export const SITE_LOGO_URL = `${SITE_URL}${SITE_LOGO_PATH}`

/**
 * Default share / preview image: generated PNG via `app/opengraph-image.tsx`
 * (social crawlers need raster; `logo.svg` is used for favicons & structured data logo).
 */
export const DEFAULT_OG_IMAGE = "/opengraph-image"

/** Full absolute URL for OG/Twitter images (required for some crawlers) */
export const DEFAULT_OG_IMAGE_URL = `${SITE_URL}/opengraph-image`

/** Dimensions of generated OG/Twitter images (match opengraph-image.tsx) */
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

/** Default meta description — AI-optimised for "online quiz india" cluster */
export const DEFAULT_DESCRIPTION =
  `Play free daily quizzes, join tournaments & win real prizes on IQ Earners — India's top online quiz app. GK, Science, History & more. Compete, rank & earn! Parent company: ${PARENT_COMPANY_NAME}.`

/** Page-specific descriptions (AI keyword-optimised) */
export const DESCRIPTIONS = {
  intro:
    "Join IQ Earners — India's best  online quiz platform. Daily GK quiz, live tournaments, real prize money. Test your knowledge & win. Free to start!",
  home:
    "Your IQ Earners quiz dashboard. Today's daily quiz, live tournament updates, your leaderboard rank & prize wallet — all in one place.",
  dailyQuiz:
    "Play today's free daily quiz on IQ Earners. New GK, science & current affairs questions every day. 30 seconds per question. Win points & climb the leaderboard!",
  tournaments:
    "Join online quiz tournaments & win real cash prizes. Live quiz competitions, countdown timers & mega prize pools. Register now on IQ Earners!",
  leaderboard:
    "IQ Earners quiz leaderboard — see today's top rankers, your score & national ranking. Who's India's quiz champion today?",
  prizes:
    "Win real prizes on IQ Earners. Cash rewards, certificates & exclusive gifts for top quiz performers. Claim your prize after every tournament!",
}

/**
 * AI-researched primary keyword set for the Indian quiz niche.
 * Targets: branded, category, long-tail, local, competitor-adjacent
 */
export const SEO_KEYWORDS = [
  // Core product
  "online quiz",
  "online quiz",
  "online quiz india",
  "play quiz online",
  "quiz app india",
  "best quiz app india",
  "daily quiz app",
  "quiz platform india",

  // GK / Academic
  "general knowledge quiz",
  "gk quiz",
  "current affairs quiz",
  "gk quiz india",
  "gk questions and answers",
  "online gk test",
  "general knowledge test online",
  "gk quiz daily",

  // Competitive / Exam prep
  "quiz competition india",
  "quiz contest online",
  "online quiz competition",
  "free quiz competition",
  "quiz tournament india",
  "competitive quiz india",

  // Prize / Reward
  "quiz with prizes india",
  "win money quiz india",
  "earn money quiz app",
  "quiz rewards app",
  "cash prize quiz india",
  "win prizes quiz",
  "paid quiz india",
  "quiz earn money",

  // Subject-specific (high search volume India)
  "science quiz online",
  "history quiz india",
  "maths quiz online",
  "english quiz online",
  "computer quiz online",
  "india gk quiz",
  "indian history quiz",
  "polity quiz india",
  "geography quiz india",
  "current affairs quiz india 2025",

  // Exam-adjacent long-tail
  "upsc quiz online",
  "ssc quiz practice",
  "eamcet quiz online",
  "railway quiz online",
  "banking quiz online",
  "ibps quiz practice",
  "sbi po quiz",
  "neet quiz practice",
  "jee quiz online",

  // App / Platform
  "quiz app free download",
  "best gk app india",
  "trivia quiz india",
  "quiz games online india",
  "online quiz website",
  "IQ Earners",
  "iq earners quiz",
  "iqearners.online",
  PARENT_COMPANY_NAME,

  // Leaderboard / Social
  "quiz leaderboard india",
  "top quiz players india",
  "quiz ranking india",
]

/** Page-specific keyword sets */
export const PAGE_KEYWORDS = {
  intro: [
    "online quiz india", "free quiz india", "daily quiz app", "best quiz app india",
    "play quiz online free", "quiz win prizes india", "quiz signup india",
    "gk quiz free", "general knowledge quiz free", "quiz platform india",
  ],
  dailyQuiz: [
    "daily quiz", "today quiz online", "daily gk quiz", "quiz of the day india",
    "daily general knowledge quiz", "free daily quiz", "daily trivia quiz",
    "quiz today", "online quiz today", "daily current affairs quiz",
  ],
  tournaments: [
    "quiz tournament india", "online quiz competition", "live quiz tournament",
    "quiz contest prizes", "paid quiz tournament", "cash prize quiz",
    "quiz championship india", "mega quiz tournament", "quiz live event",
    "competitive quiz online india",
  ],
  leaderboard: [
    "quiz leaderboard", "top quiz rankers india", "quiz ranking india",
    "quiz score leaderboard", "best quiz players india", "online quiz ranking",
    "national quiz leaderboard", "quiz champion india", "gk quiz top score",
  ],
  prizes: [
    "quiz prizes india", "win money quiz", "quiz cash prize", "quiz reward india",
    "quiz prize money", "win prizes online quiz", "quiz earn money india",
    "quiz certificate online", "quiz winner prize", "online quiz reward",
  ],
  home: [
    "quiz dashboard", "my quiz stats", "daily quiz progress", "quiz streak",
    "quiz score", "my leaderboard rank", "quiz app dashboard", "iq earners home",
  ],
}

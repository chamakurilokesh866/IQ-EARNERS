import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

type SitemapEntry = {
  url: string
  lastModified: Date
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority: number
}

/** Public routes with AI-optimised priorities and change frequencies */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: SitemapEntry["changeFrequency"] }[] = [
  // Landing / intro — highest crawl priority
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/intro", priority: 1.0, changeFrequency: "weekly" },

  // Core product pages — daily freshness signals
  { path: "/daily-quiz", priority: 0.97, changeFrequency: "daily" },
  { path: "/tournaments", priority: 0.95, changeFrequency: "daily" },
  { path: "/leaderboard", priority: 0.92, changeFrequency: "daily" },
  { path: "/prizes", priority: 0.88, changeFrequency: "weekly" },

  // Discovery / join
  { path: "/more/join", priority: 0.80, changeFrequency: "weekly" },
  { path: "/more/faq", priority: 0.76, changeFrequency: "weekly" },
  { path: "/integration-guide", priority: 0.74, changeFrequency: "weekly" },
  { path: "/more/api-guide", priority: 0.74, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.62, changeFrequency: "monthly" },

  // Legal pages — low churn, indexed for Bing/Yandex trust signals
  { path: "/more/terms", priority: 0.45, changeFrequency: "monthly" },
  { path: "/more/privacy", priority: 0.45, changeFrequency: "monthly" },
  { path: "/more/rules", priority: 0.50, changeFrequency: "monthly" },
  { path: "/more/grievance", priority: 0.40, changeFrequency: "monthly" },
  { path: "/more/refund", priority: 0.40, changeFrequency: "monthly" },
  { path: "/more/disclaimer", priority: 0.40, changeFrequency: "monthly" },
  { path: "/more/cookie-policy", priority: 0.40, changeFrequency: "monthly" },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/$/, "")
  const now = new Date()

  // Daily quiz gets a fresh lastModified every day at midnight IST → signal for Googlebot
  const todayMidnightIST = new Date()
  todayMidnightIST.setUTCHours(18, 30, 0, 0) // 18:30 UTC = 00:00 IST next day marker

  return STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified:
      changeFrequency === "daily"
        ? todayMidnightIST // Fresh signal for daily quiz, tournaments, leaderboard
        : now,
    changeFrequency,
    priority,
  }))
}

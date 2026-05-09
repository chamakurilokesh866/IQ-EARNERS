import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

/**
 * robots.ts — Crawl directives.
 * NOTE: Token-based URL enforcement is bypassed for known crawlers in middleware,
 * so bare paths here remain valid for SEO purposes.
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, "")

  const PRIVATE_PATHS = [
    "/api/",
    "/a/",
    "/more/admin-login",
    "/more/admin-dashboard",
    "/more/admin",
    "/create-username",
    "/login",
    "/payment/",
    "/paywall/",
    "/user",
    "/blocked",
    "/unblock",
    "/dashboard",
    "/*?*", // block query-string variants to avoid duplicate content
  ]

  return {
    rules: [
      // General bots: allow public pages, block private
      {
        userAgent: "*",
        allow: ["/", "/intro", "/daily-quiz", "/tournaments", "/leaderboard", "/prizes", "/contact", "/integration-guide", "/more/faq", "/more/api-guide", "/more/terms", "/more/privacy", "/more/rules", "/more/refund", "/more/disclaimer", "/more/cookie-policy", "/more/grievance"],
        disallow: PRIVATE_PATHS,
        crawlDelay: 2,
      },

      // Googlebot: full access, no crawl delay
      {
        userAgent: "Googlebot",
        allow: ["/", "/intro", "/daily-quiz", "/tournaments", "/leaderboard", "/prizes", "/contact", "/more/"],
        disallow: PRIVATE_PATHS,
      },

      // Bingbot
      {
        userAgent: "Bingbot",
        allow: ["/", "/intro", "/daily-quiz", "/tournaments", "/leaderboard"],
        disallow: PRIVATE_PATHS,
        crawlDelay: 3,
      },

      // DuckDuckBot
      {
        userAgent: "DuckDuckBot",
        allow: ["/", "/intro", "/daily-quiz", "/tournaments"],
        disallow: PRIVATE_PATHS,
        crawlDelay: 3,
      },

      // Block scrapers that cost bandwidth without SEO benefit
      { userAgent: "AhrefsBot", disallow: ["/"] },
      { userAgent: "SemrushBot", disallow: ["/"] },
      { userAgent: "PetalBot", disallow: ["/"] },
      { userAgent: "MJ12bot", disallow: ["/"] },
      { userAgent: "DotBot", disallow: ["/"] },
      { userAgent: "GPTBot", disallow: ["/"] },       // block OpenAI crawler
      { userAgent: "Claude-Web", disallow: ["/"] },   // block Anthropic crawler
      { userAgent: "CCBot", disallow: ["/"] },        // block Common Crawl
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}

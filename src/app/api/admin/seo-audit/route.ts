/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI SEO Audit API — Admin only.
 * POST /api/admin/seo-audit
 * Body: { url?: string, pageType?: string }
 *
 * Uses NVIDIA NIM AI to analyse a page's SEO and return:
 *  - Overall SEO score (0-100)
 *  - Issues found (critical, warning, info)
 *  - Specific improvement suggestions with implementation hints
 *  - Keyword gap analysis for Indian quiz niche
 *  - Content recommendations
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { chatCompletionForAdminAI, isAdminAiConfigured } from "@/lib/aiGateway"
import { SITE_URL, SEO_KEYWORDS, PAGE_KEYWORDS } from "@/lib/seo"

const QUIZ_NICHE_KEYWORDS = [
    "online quiz india", "daily gk quiz", "quiz tournament india",
    "play quiz online", "quiz with prizes", "general knowledge quiz", "quiz app india",
    "competitive quiz", "quiz win money india",
]

type AuditRequest = {
    pageType?: keyof typeof PAGE_KEYWORDS | "root"
    customContent?: string // Optional: paste page HTML/text for AI to analyse
}

export async function POST(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: "Admin required" }, { status: 401 })

    const body: AuditRequest = await req.json().catch(() => ({}))
    const pageType = body.pageType ?? "root"
    const relevantKeywords = pageType === "root"
        ? SEO_KEYWORDS.slice(0, 20)
        : (PAGE_KEYWORDS as any)[pageType] ?? SEO_KEYWORDS.slice(0, 10)

    const pageUrl = pageType === "root"
        ? SITE_URL
        : `${SITE_URL}/${pageType === "dailyQuiz" ? "daily-quiz" : pageType}`

    if (!isAdminAiConfigured()) {
        return NextResponse.json({
            ok: true,
            data: buildFallbackAudit(pageType, relevantKeywords),
        })
    }

    const customContent = body.customContent
    const hasCustomContent = typeof customContent === "string" && customContent.trim().length > 50
    const contentSection = hasCustomContent && typeof customContent === "string"
        ? "\n\nPAGE CONTENT (excerpt):\n" + customContent.trim().slice(0, 2000)
        : ""

    const prompt =
        "You are an expert SEO analyst specialising in Indian quiz and ed-tech platforms.\n\n" +
        "SITE: IQ Earners (iqearners.online)\n" +
        "TYPE: Online quiz platform for India — daily GK, tournaments, prizes\n" +
        "KEY COMPETITORS: Qureka, KBC Quiz, BrainBaazi, Loco, Vedantu, Quiz Club\n" +
        "PAGE BEING AUDITED: " + pageUrl + " (type: " + pageType + ")\n" +
        "TARGET KEYWORDS: " + relevantKeywords.slice(0, 8).join(", ") + "\n" +
        "NICHE KEYWORDS TO CHECK: " + QUIZ_NICHE_KEYWORDS.slice(0, 6).join(", ") + "\n" +
        contentSection +
        "\n\nPerform a comprehensive SEO audit for this page. Output ONLY valid JSON (no markdown):\n" +
        "{\n" +
        '  "score": <number 0-100>,\n' +
        '  "grade": "A" | "B" | "C" | "D" | "F",\n' +
        '  "summary": "<2 sentence overall assessment>",\n' +
        '  "issues": [\n' +
        '    { "severity": "critical"|"warning"|"info", "category": "Title"|"Meta"|"Keywords"|"Schema"|"Content"|"Technical"|"Backlinks", "issue": "<specific issue>", "fix": "<actionable fix with code snippet if applicable>" }\n' +
        "  ],\n" +
        '  "keywordGaps": ["<keyword missing from page that competitors rank for>"],\n' +
        '  "contentSuggestions": ["<specific content addition or change to improve rankings>"],\n' +
        '  "quickWins": ["<3-5 things that can be done in hours to improve rankings>"],\n' +
        '  "estimatedImpact": "<low|medium|high> — one sentence on expected ranking improvement"\n' +
        "}\n\n" +
        "Focus on: title tag length/keywords, meta description CTR optimisation, schema markup gaps, " +
        "keyword density vs. Indian quiz niche, mobile-first indexing, Core Web Vitals hints, " +
        "internal linking opportunities, and content freshness signals.\n" +
        "Be specific, actionable, and reference real Indian quiz search terms. JSON only."

    try {
        const result = await chatCompletionForAdminAI(
            [{ role: "user", content: prompt }],
            { temperature: 0.4, max_tokens: 1200 }
        )

        if (!result.ok) {
            return NextResponse.json({ ok: true, data: buildFallbackAudit(pageType, relevantKeywords) })
        }

        let text = result.content.trim()
        const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (mdMatch) text = mdMatch[1].trim()
        const start = text.indexOf("{")
        const end = text.lastIndexOf("}") + 1
        if (start >= 0 && end > start) text = text.slice(start, end)

        const parsed = JSON.parse(text)

        return NextResponse.json({
            ok: true,
            data: {
                score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 60,
                grade: typeof parsed.grade === "string" ? parsed.grade : "C",
                summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 300) : "",
                issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 15) : [],
                keywordGaps: Array.isArray(parsed.keywordGaps) ? parsed.keywordGaps.slice(0, 8) : [],
                contentSuggestions: Array.isArray(parsed.contentSuggestions) ? parsed.contentSuggestions.slice(0, 6) : [],
                quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins.slice(0, 5) : [],
                estimatedImpact: typeof parsed.estimatedImpact === "string" ? parsed.estimatedImpact.slice(0, 200) : "",
                pageUrl,
                pageType,
                auditedAt: new Date().toISOString(),
            },
        })
    } catch {
        return NextResponse.json({ ok: true, data: buildFallbackAudit(pageType, relevantKeywords) })
    }
}

function buildFallbackAudit(pageType: string, keywords: string[]) {
    return {
        score: 68,
        grade: "C",
        summary:
            "AI audit unavailable — using baseline analysis. Configure ADMIN_AI_API_KEY for full AI-powered SEO audit.",
        issues: [
            {
                severity: "critical",
                category: "Schema",
                issue: "No page-specific JSON-LD schema detected",
                fix: "Add Course, Event, or ItemList schema to high-traffic pages",
            },
            {
                severity: "warning",
                category: "Keywords",
                issue: "Target keywords may not appear in H1/H2 headings",
                fix: `Ensure page H1 contains one of: ${keywords.slice(0, 3).join(", ")}`,
            },
            {
                severity: "info",
                category: "Content",
                issue: "Page content freshness — daily quiz pages should update daily",
                fix: "Add last-updated timestamp visible to crawlers for dynamic pages",
            },
        ],
        keywordGaps: ["quiz competition india", "earn money quiz app", "gk quiz india"],
        contentSuggestions: [
            "Add a 'How it works' section with GK quiz keywords in h2 headings",
            "Include user testimonials mentioning 'online quiz' and 'prizes' naturally",
        ],
        quickWins: [
            "Add alt text to all images with quiz-niche keywords",
            "Ensure sitemap.xml is submitted in Google Search Console",
            "Add breadcrumb JSON-LD to all non-landing pages",
        ],
        estimatedImpact: "medium — following these fixes could improve rankings within 2-4 weeks",
        pageType,
        auditedAt: new Date().toISOString(),
    }
}

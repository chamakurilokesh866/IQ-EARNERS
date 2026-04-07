import { NextResponse } from "next/server"
import { chatCompletionForAdminAI, isAdminAiConfigured } from "@/lib/aiGateway"

const cache = new Map<string, { ts: number; data: object }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour for public content

function buildFallbackContent() {
    return {
        greeting: "Welcome to IQ Earners, where every question is an opportunity. Let's start your journey to success today.",
        tip: "💡 Start by setting a consistent daily study time. Research shows that studying at the same time each day increases retention by up to 40%.",
        quote: "🎯 'The best way to predict your future is to create it.' — Abraham Lincoln"
    }
}

export async function GET() {
    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = "intro:" + today
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return NextResponse.json({ ok: true, data: cached.data, cached: true })
    }

    if (!isAdminAiConfigured()) {
        return NextResponse.json({ ok: true, data: buildFallbackContent(), cached: false })
    }

    const dateStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" })

    const prompt =
        "You are generating a welcoming AI insight for the landing page of IQ Earners, a top-tier Indian competitive quiz platform.\n\n" +
        "TODAY: " + dateStr + "\n\n" +
        'Generate a JSON response ONLY (no markdown, no code blocks) with exactly these 3 fields:\n' +
        '{\n' +
        '  "greeting": "A high-impact, welcoming 1-sentence opening about the importance of daily practice and IQ development. Under 100 chars.",\n' +
        '  "tip": "A fresh, daily study tip (1-2 sentences) relevant to competitive exams like UPSC, SSC, or IBPS. Focus on cognition and discipline. Under 180 chars.",\n' +
        '  "quote": "A powerful motivational quote (1 sentence) for a student starting their day. Must be crisp and inspiring."\n' +
        '}\n\n' +
        "Rules:\n" +
        "- Keep language professional, inspiring, and direct\n" +
        "- No emojis in greeting, 1 emoji in tip and quote\n" +
        "- JSON only, perfectly valid, no trailing commas"

    try {
        const result = await chatCompletionForAdminAI(
            [{ role: "user", content: prompt }],
            { temperature: 0.8, max_tokens: 300 }
        )
        if (!result.ok) {
            return NextResponse.json({ ok: true, data: buildFallbackContent(), cached: false })
        }

        let text = result.content.trim()
        const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (mdMatch) text = mdMatch[1].trim()
        const start = text.indexOf("{")
        const end = text.lastIndexOf("}") + 1
        if (start >= 0 && end > start) text = text.slice(start, end)

        const parsed = JSON.parse(text)
        const data = {
            greeting: typeof parsed.greeting === "string" ? parsed.greeting.slice(0, 150) : buildFallbackContent().greeting,
            tip: typeof parsed.tip === "string" ? parsed.tip.slice(0, 250) : buildFallbackContent().tip,
            quote: typeof parsed.quote === "string" ? parsed.quote.slice(0, 200) : buildFallbackContent().quote,
        }

        cache.set(cacheKey, { ts: Date.now(), data })
        return NextResponse.json({ ok: true, data, cached: false })
    } catch {
        return NextResponse.json({ ok: true, data: buildFallbackContent(), cached: false })
    }
}

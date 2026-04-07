/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI-powered personalised homepage content for logged-in users.
 * GET /api/ai/home-content
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid } from "@/lib/profiles"
import { getUserStats } from "@/lib/userStats"
import { chatCompletionForAdminAI, isAdminAiConfigured } from "@/lib/aiGateway"

const cache = new Map<string, { ts: number; data: object }>()
const CACHE_TTL_MS = 5 * 60 * 1000

async function getUsername(): Promise<string | null> {
    try {
        const store = await cookies()
        const uid = store.get("uid")?.value ?? ""
        if (uid) {
            const profile = await getProfileByUid(uid)
            if (profile?.username) return profile.username
        }
        const v = store.get("username")?.value
        return v ? decodeURIComponent(v.trim()) : null
    } catch {
        return null
    }
}

function calcStreak(dates: string[]): number {
    if (!dates.length) return 0
    const sorted = [...new Set(dates)].sort().reverse()
    let streak = 0
    const today = new Date().toISOString().slice(0, 10)
    let expect = today
    for (const d of sorted) {
        if (d === expect) {
            streak++
            const prev = new Date(expect)
            prev.setDate(prev.getDate() - 1)
            expect = prev.toISOString().slice(0, 10)
        } else if (d < expect) break
    }
    return streak
}

function buildFallbackContent(username: string) {
    const hour = new Date().getHours()
    const greetWord = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
    return {
        greeting: greetWord + ", " + username + "! Ready to climb the leaderboard today?",
        tip: "📌 Try active recall — close your notes and write down everything you remember. It's the single most effective study method for competitive exams.",
        spotlight: "🎯 Today's focus: Complete the daily quiz in your first attempt for maximum streak impact.",
    }
}

export async function GET() {
    const username = await getUsername()
    if (!username) {
        return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 })
    }

    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = username.toLowerCase() + ":" + today
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return NextResponse.json({ ok: true, data: cached.data, cached: true })
    }

    if (!isAdminAiConfigured()) {
        return NextResponse.json({ ok: true, data: buildFallbackContent(username), cached: false })
    }

    const raw = await getUserStats(username).catch(() => null)
    const history: { date: string; score: number; total: number }[] = (raw?.history as any[]) ?? []
    const streak = raw?.completedDates ? calcStreak(raw.completedDates as string[]) : 0
    const completedCount = history.length
    const recentScores = history.slice(-5)
    const avgScore = recentScores.length
        ? Math.round(
            recentScores.reduce((s, h) => s + (h.total > 0 ? (h.score / h.total) * 100 : 0), 0) /
            recentScores.length
        )
        : null
    const completedByQuiz = raw?.completedByQuiz as Record<string, { score: number; total: number }> | undefined
    const quizCount = completedByQuiz ? Object.keys(completedByQuiz).length : 0
    const avgScoreStr = avgScore != null ? avgScore + "%" : "No data yet"
    const levelStr = avgScore != null ? avgScore + "% average" : "beginner"
    const dateStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" })

    const prompt =
        "You are generating personalised homepage content for a competitive quiz platform user.\n\n" +
        "USER PROFILE:\n" +
        "- Username: " + username + "\n" +
        "- Current streak: " + streak + " days\n" +
        "- Total quizzes completed: " + completedCount + "\n" +
        "- Unique quiz sets done: " + quizCount + "\n" +
        "- Recent average score: " + avgScoreStr + "\n" +
        "- Today: " + dateStr + "\n\n" +
        'Generate a JSON response ONLY (no markdown, no code blocks) with exactly these 3 fields:\n' +
        '{\n' +
        '  "greeting": "A personalised warm 1-sentence greeting for ' + username + '. Reference their streak or score if notable. Under 80 chars.",\n' +
        '  "tip": "A practical study tip in 1-2 sentences tailored to their level (' + levelStr + '). Must be actionable and specific to competitive exam prep.",\n' +
        '  "spotlight": "A 1-sentence motivational spotlight — what they should focus on TODAY. Punchy and specific."\n' +
        '}\n\n' +
        "Rules:\n" +
        "- Use actual stats to personalise each field\n" +
        "- Keep language encouraging, smart, and direct — not generic\n" +
        "- No emojis in greeting, 1 emoji in tip and spotlight\n" +
        "- JSON only, perfectly valid, no trailing commas"

    try {
        const result = await chatCompletionForAdminAI(
            [{ role: "user", content: prompt }],
            { temperature: 0.75, max_tokens: 300 }
        )
        if (!result.ok) {
            return NextResponse.json({ ok: true, data: buildFallbackContent(username), cached: false })
        }

        let text = result.content.trim()
        const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (mdMatch) text = mdMatch[1].trim()
        const start = text.indexOf("{")
        const end = text.lastIndexOf("}") + 1
        if (start >= 0 && end > start) text = text.slice(start, end)

        const parsed = JSON.parse(text)
        const data = {
            greeting: typeof parsed.greeting === "string" ? parsed.greeting.slice(0, 120) : "Welcome back, " + username + "!",
            tip: typeof parsed.tip === "string" ? parsed.tip.slice(0, 250) : "",
            spotlight: typeof parsed.spotlight === "string" ? parsed.spotlight.slice(0, 180) : "",
        }

        cache.set(cacheKey, { ts: Date.now(), data })
        return NextResponse.json({ ok: true, data, cached: false })
    } catch {
        return NextResponse.json({ ok: true, data: buildFallbackContent(username), cached: false })
    }
}

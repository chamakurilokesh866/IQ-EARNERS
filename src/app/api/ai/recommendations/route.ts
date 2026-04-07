/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI-powered quiz recommendation engine based on user activity.
 * GET /api/ai/recommendations
 * Analyses completed quizzes, scores, and weak areas to suggest next quizzes.
 * Returns a list of recommendations with reasoning.
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid } from "@/lib/profiles"
import { getUserStats } from "@/lib/userStats"
import { createServerSupabase } from "@/lib/supabase"
import { chatCompletionForAdminAI, isAdminAiConfigured } from "@/lib/aiGateway"

const cache = new Map<string, { ts: number; data: object[] }>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

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

export async function GET() {
    const username = await getUsername()
    if (!username) {
        return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 })
    }

    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = `rec:${username.toLowerCase()}:${today}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return NextResponse.json({ ok: true, data: cached.data, cached: true })
    }

    // Fetch user stats
    const raw = await getUserStats(username).catch(() => null)
    const completedByQuiz = raw?.completedByQuiz as Record<string, { score: number; total: number }> | undefined
    const history: { date: string; score: number; total: number }[] = raw?.history ?? []
    const streak: number = raw?.completedDates ? calcStreak(raw.completedDates as string[]) : 0
    const completedQuizIds = Object.keys(completedByQuiz ?? {})

    // Fetch available quizzes from Supabase
    const supabase = createServerSupabase()
    let availableQuizzes: { id: string; title: string; topic?: string; category?: string }[] = []
    if (supabase) {
        try {
            const { data } = await supabase
                .from("quizzes")
                .select("id, title, topic, category")
                .order("created_at", { ascending: false })
                .limit(50)
            if (Array.isArray(data)) {
                availableQuizzes = data.map((q: any) => ({
                    id: String(q.id),
                    title: String(q.title ?? "Untitled"),
                    topic: q.topic ?? "",
                    category: q.category ?? "",
                }))
            }
        } catch {
            // DB unavailable — continue with empty quiz list
        }
    }

    // Filter out completed quizzes
    const uncompletedQuizzes = availableQuizzes.filter((q) => !completedQuizIds.includes(q.id))

    // Build performance summary
    const perfSummary = completedQuizIds.map((id) => {
        const entry = completedByQuiz![id]
        const pct = entry.total > 0 ? Math.round((entry.score / entry.total) * 100) : 0
        const quiz = availableQuizzes.find((q) => q.id === id)
        return { id, title: quiz?.title ?? id, score: pct }
    }).sort((a, b) => a.score - b.score) // weak first

    const weakAreas = perfSummary.slice(0, 3).map((p) => `${p.title} (${p.score}%)`)
    const avgScore = history.length
        ? Math.round(history.slice(-10).reduce((s, h) => s + (h.total > 0 ? (h.score / h.total) * 100 : 0), 0) / Math.min(history.length, 10))
        : null

    // If AI not configured or no quiz data, return smart fallback
    if (!isAdminAiConfigured() || uncompletedQuizzes.length === 0) {
        const fallback = buildFallbackRecs(uncompletedQuizzes, weakAreas, streak)
        return NextResponse.json({ ok: true, data: fallback, cached: false })
    }

    const quizList = uncompletedQuizzes.slice(0, 20).map((q) => `- ID: ${q.id} | "${q.title}"${q.topic ? ` [${q.topic}]` : ""}`).join("\n")

    const prompt = `You are a personalised quiz recommendation engine for a competitive exam platform.

USER PROFILE:
- Username: ${username}
- Streak: ${streak} days
- Average score (last 10): ${avgScore != null ? `${avgScore}%` : "N/A"}
- Total completed: ${completedQuizIds.length} quizzes
- Weak areas (lowest scores): ${weakAreas.length > 0 ? weakAreas.join(", ") : "None yet"}

AVAILABLE QUIZZES (not yet completed):
${quizList || "No new quizzes available."}

Recommend exactly 4 quizzes from the AVAILABLE list above. If fewer than 4 are available, recommend all of them.

Output ONLY valid JSON array (no markdown, no code blocks):
[
  {
    "id": "quiz_id_here",
    "title": "Quiz title here",
    "reason": "1 sentence: why this quiz suits this user specifically based on their stats",
    "priority": "high" | "medium" | "low",
    "tag": "Improve Weakness" | "Next Step" | "Build Streak" | "Challenge Mode"
  }
]

Selection strategy:
1. Prioritise quizzes that address their weak areas
2. Mix difficulty — include at least 1 challenging quiz if avg score > 70%
3. Include at least 1 "Build Streak" recommendation if streak < 3
4. Reasons must reference their specific stats (score, streak, etc.)
5. JSON only, no extra text`

    try {
        const result = await chatCompletionForAdminAI(
            [{ role: "user", content: prompt }],
            { temperature: 0.6, max_tokens: 600 }
        )

        if (!result.ok) throw new Error(result.error)

        let text = result.content.trim()
        const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) text = match[1].trim()
        const start = text.indexOf("[")
        const end = text.lastIndexOf("]") + 1
        if (start >= 0 && end > start) text = text.slice(start, end)

        const arr = JSON.parse(text)
        const recs = Array.isArray(arr)
            ? arr
                .filter((r: any) => r?.id && r?.title && r?.reason)
                .slice(0, 4)
                .map((r: any) => ({
                    id: String(r.id),
                    title: String(r.title).slice(0, 80),
                    reason: String(r.reason).slice(0, 160),
                    priority: ["high", "medium", "low"].includes(r.priority) ? r.priority : "medium",
                    tag: typeof r.tag === "string" ? r.tag.slice(0, 30) : "Recommended",
                }))
            : []

        if (recs.length === 0) throw new Error("Empty recommendations")

        cache.set(cacheKey, { ts: Date.now(), data: recs })
        return NextResponse.json({ ok: true, data: recs, cached: false })
    } catch {
        const fallback = buildFallbackRecs(uncompletedQuizzes, weakAreas, streak)
        return NextResponse.json({ ok: true, data: fallback, cached: false })
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

function buildFallbackRecs(
    quizzes: { id: string; title: string }[],
    weakAreas: string[],
    streak: number
): object[] {
    return quizzes.slice(0, 4).map((q, i) => ({
        id: q.id,
        title: q.title,
        reason: i === 0 && weakAreas.length > 0
            ? `Addresses your weak area in ${weakAreas[0].split(" (")[0]}`
            : streak < 3
                ? "Complete this to build your daily streak"
                : "Continue your learning journey with this quiz",
        priority: i === 0 ? "high" : i === 1 ? "medium" : "low",
        tag: i === 0 && weakAreas.length > 0 ? "Improve Weakness" : streak < 3 ? "Build Streak" : "Next Step",
    }))
}

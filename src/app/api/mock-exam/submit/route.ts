import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabase } from "@/lib/supabase"
import { getUserStats, setUserStats, UserStatsData } from "@/lib/userStats"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { answers, timeTaken, course = "main" } = body

        const supabase = createServerSupabase()
        if (!supabase) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 })

        const { data: mockExam, error: qError } = await supabase
            .from("mock_exams")
            .select("questions")
            .eq("id", course)
            .single()

        if (qError || !mockExam) return NextResponse.json({ ok: false, error: "Mock exam questions not found" }, { status: 404 })

        let questions: { question?: string; options?: string[]; correct?: number; explanation?: string }[]
        const q = mockExam.questions
        if (Array.isArray(q)) {
            questions = q
        } else if (q && typeof q === "object" && Array.isArray((q as { modules?: unknown[] }).modules)) {
            questions = ((q as { modules: { questions?: unknown[] }[] }).modules || []).flatMap((m) => (m.questions || []) as { question?: string; options?: string[]; correct?: number; explanation?: string }[])
        } else {
            return NextResponse.json({ ok: false, error: "Invalid mock exam format" }, { status: 404 })
        }
        if (!questions.length) return NextResponse.json({ ok: false, error: "No questions found" }, { status: 404 })

        let score = 0
        const detailedResults = questions.map((q: any, i: number) => {
            const isCorrect = answers[i] === q.correct
            if (isCorrect) score++
            return {
                id: i,
                question: q.question,
                options: q.options,
                correct: q.correct,
                userAnswer: answers[i] ?? -1,
                isCorrect,
                explanation: q.explanation
            }
        })

        // Save to user stats in Supabase
        const cookieStore = await cookies()
        const username = cookieStore.get("username")?.value

        if (username) {
            const currentStats = await getUserStats(username) || {}

            const newHistoryItem = {
                date: new Date().toISOString().slice(0, 10),
                score,
                total: questions.length,
                totalTimeSeconds: timeTaken || 0
            }

            const newReport = {
                quizId: `mock-exam-${course}-${Date.now()}`,
                score,
                total: questions.length,
                totalTimeSeconds: timeTaken || 0,
                date: new Date().toISOString()
            }

            const updatedStats: UserStatsData = {
                ...currentStats,
                history: [newHistoryItem, ...(currentStats.history || [])].slice(0, 100),
                // Custom field for mock exams
                completedByQuiz: {
                    ...(currentStats.completedByQuiz || {}),
                    [`mock-exam-${course}-${Date.now()}`]: {
                        score,
                        total: questions.length,
                        totalTimeSeconds: timeTaken || 0,
                        rows: detailedResults
                    }
                }
            }

            await setUserStats(username, updatedStats)
        }

        return NextResponse.json({ ok: true, score, total: questions.length, results: detailedResults })
    } catch (error: any) {
        console.error("Submission error:", error)
        return NextResponse.json({ ok: false, error: "Submission failed" }, { status: 500 })
    }
}

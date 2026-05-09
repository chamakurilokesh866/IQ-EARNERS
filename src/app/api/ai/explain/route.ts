import { NextResponse } from "next/server"
import { chatCompletion } from "@/lib/aiGateway"
import { requirePaidUser } from "@/lib/auth"
import { rateLimit } from "@/lib/rateLimit"

export const maxDuration = 60

export async function POST(req: Request) {
    try {
        const user = await requirePaidUser()
        if (!user.ok) return NextResponse.json({ ok: false, error: user.error }, { status: user.status })
        const rl = await rateLimit(req, "ai")
        if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
        const body = await req.json().catch(() => null)
        if (!body) return NextResponse.json({ ok: false, error: "Empty request body" }, { status: 400 })

        let promptText = ""

        if (body.prompt) {
            promptText = body.prompt
        } else if (body.question && body.correctAnswer) {
            const { question, userAnswer, correctAnswer, explanation } = body
            promptText = `You are an expert AI Tutor helping a student understand a quiz question.
Be extremely encouraging, concise, and clear.
Explain exactly why their answer (if any) is incorrect, and why the correct answer is right. 

Question: ${question}
Student's Answer: ${userAnswer || "Skipped"}
Correct Answer: ${correctAnswer}
Original Explanation (if any): ${explanation || "None"}

Write a short, engaging 2-3 sentence explanation.`
        } else {
            return NextResponse.json({ 
                ok: false, 
                error: `Missing required fields. Provide either 'prompt' or 'question' + 'correctAnswer'.` 
            }, { status: 400 })
        }

        const aiResult = await chatCompletion([
            { role: "system", content: "You are a helpful and brilliant tutor." },
            { role: "user", content: promptText }
        ])

        if (!aiResult.ok || !aiResult.content) {
            return NextResponse.json({ ok: false, error: "AI tutor is resting right now. Try again later." }, { status: 500 })
        }

        return NextResponse.json({ ok: true, text: aiResult.content, data: aiResult.content })
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message || "Failed to get AI explanation" }, { status: 500 })
    }
}

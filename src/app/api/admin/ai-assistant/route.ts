/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin-only: Real AI chat for the Admin AI Assistant panel.
 * Uses ADMIN_AI_API_KEY (separate from Quiz & Mock Exam).
 * POST /api/admin/ai-assistant
 * Body: { messages: { role, content }[], siteContext?: object, includeHealthCheck?: boolean }
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { chatCompletionForAdminAI, isAdminAiConfigured } from "@/lib/aiGateway"
import { getWebsiteHealth } from "@/lib/websiteHealth"

const SYSTEM_PROMPT = `You are an expert AI Website Admin Assistant for a quiz and learning platform called IQ Earners (iqearners.online).

Your role is to help the admin monitor, maintain, and improve the website. You have deep knowledge of:
- Web performance, error analysis, and HTTP status codes
- SEO best practices and keyword research for educational platforms
- Database optimization (PostgreSQL / Supabase)
- Security monitoring (brute force, bot detection, CAPTCHA)
- User analytics and engagement metrics
- Content strategy for educational quiz platforms
- Push notification best practices
- Growth hacking for ed-tech platforms

Platform context:
- Stack: Next.js 14, Supabase (PostgreSQL), Vercel deployment
- Features: Quiz battles, tournaments, leaderboard, mock exams, certificates, referral system
- Payment: Cashfree + QR/UPI manual payments
- Users: Students preparing for EAMCET, UPSC, and general competitive exams in India
- Revenue: Tournament entry fees, unblock fees

Rules you MUST always follow:
1. NEVER suggest destructive or irreversible actions without a clear warning
2. Always explain the root cause of problems, not just the symptom
3. Provide specific, actionable recommendations
4. When suggesting SQL or code, mark it clearly and explain what it does
5. Be concise but thorough — the admin is busy
6. Flag security issues with 🚨, warnings with ⚠️, good news with ✅
7. Use markdown formatting for readability (bold, bullet points, code blocks)
8. When you don't have real data, say so and explain what to look for

You can assist with:
- Error monitoring & root cause analysis
- Auto-maintenance suggestions (cache, DB, cleanup)
- Homepage & blog content generation
- User analytics interpretation
- SEO optimization for quiz pages
- Security threat assessment
- Smart recommendation strategies
- Database query optimization
- Growth strategy & content gaps
- Notification copy & scheduling

Always end complex responses with a clear next action the admin can take immediately.`

export async function POST(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    if (!isAdminAiConfigured()) {
        return NextResponse.json({
            ok: false,
            error: "No AI API key configured. Add ADMIN_AI_API_KEY in .env.local"
        }, { status: 503 })
    }

    const body = await req.json().catch(() => ({}))
    const messages: { role: "user" | "assistant" | "system"; content: string }[] = Array.isArray(body?.messages) ? body.messages : []

    // Validate roles
    const validRoles = new Set(["user", "assistant", "system"])
    const sanitized = messages
        .filter((m) => validRoles.has(m.role) && typeof m.content === "string" && m.content.trim().length > 0)
        .slice(-20) // keep last 20 messages max (context window safety)

    if (sanitized.length === 0 || sanitized[sanitized.length - 1]?.role !== "user") {
        return NextResponse.json({ ok: false, error: "Messages must end with a user message" }, { status: 400 })
    }

    const siteContext = body?.siteContext
    const lastUserMsg = (sanitized.filter((m) => m.role === "user").pop()?.content || "").toLowerCase()
    const wantsHealthCheck = body?.includeHealthCheck === true ||
        /\b(check|error|website|health|broken|404|500|issue|problem|status)\b/.test(lastUserMsg)

    let systemContent = SYSTEM_PROMPT

    if (siteContext && typeof siteContext === "object") {
        const ctx = [
            siteContext.totalPlayers != null && `- Total players: ${siteContext.totalPlayers}`,
            siteContext.activeToday != null && `- Active today: ${siteContext.activeToday}`,
            siteContext.quizzesCount != null && `- Quiz sets: ${siteContext.quizzesCount}`,
            siteContext.tournamentsCount != null && `- Tournaments: ${siteContext.tournamentsCount}`,
            siteContext.revenue30d != null && `- Revenue (30d): ₹${siteContext.revenue30d}`,
            siteContext.pendingPayments != null && `- Pending payments: ${siteContext.pendingPayments}`,
        ].filter(Boolean).join("\n")
        if (ctx) systemContent += `\n\nLive site stats (as of now):\n${ctx}`
    }

    if (wantsHealthCheck) {
        const health = await getWebsiteHealth()
        const healthBlob = [
            "\n\n**REAL-TIME WEBSITE HEALTH (just checked):**",
            `- Database: ${health.db.connected ? "✅ Connected" : `❌ ${health.db.error}`}`,
            `- Error log (last 1h): ${health.errorLogCountLastHour} client errors`,
            `- Security alerts: ${health.securityAlerts.length} (${JSON.stringify(health.securityAlerts)})`,
            health.issues.length > 0 ? `- **Issues detected:** ${health.issues.join("; ")}` : "- No critical issues detected",
            `- Overall: ${health.overallHealthy ? "✅ Healthy" : "⚠️ Needs attention"}`,
        ].join("\n")
        systemContent += healthBlob
    }

    const fullMessages: { role: "user" | "assistant" | "system"; content: string }[] = [
        { role: "system", content: systemContent },
        ...sanitized,
    ]

    try {
        const result = await chatCompletionForAdminAI(fullMessages, {
            temperature: 0.65,
            max_tokens: 2048,
        })

        if (!result.ok) {
            return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
        }

        return NextResponse.json({
            ok: true,
            content: result.content,
            usage: result.usage,
        })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message ?? "AI request failed" }, { status: 500 })
    }
}

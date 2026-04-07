import { NextResponse } from "next/server"
import { chatCompletion } from "@/lib/aiGateway"

export const maxDuration = 60

// ── Rate Limiting ──────────────────────────────────────────────────────────
const rateMap = new Map<string, { count: number; firstAt: number }>()
const RATE_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_MAX = 5 // max 5 AI requests per minute per IP

const IQ_EARNERS_KNOWLEDGE = `
You are the expert AI Support Agent for IQ Earners — India's premier online quiz and earning platform.
Your personality: Friendly, helpful, concise, and professional. You reply in the same language the user writes in (Hindi, Telugu, Tamil, English, etc.).

=== ABOUT IQ EARNERS ===
IQ Earners is a skill-based online quiz platform where users pay a one-time entry fee and earn real money through daily quizzes, tournaments, and referrals. Headquartered in India.
Website: www.iqearners.online | Support: contact@iqearners.online

=== HOW TO JOIN ===
1. Visit www.iqearners.online and click "Get Started" or "Log in".
2. Pay the one-time platform entry fee (shown at registration — typically ₹100–₹299).
3. Create a username and you're in. No monthly subscription.
4. Free users can see the intro but cannot participate in paid quizzes.

=== DAILY QUIZ ===
- A new quiz is published every day by the admin. It becomes available at a scheduled time.
- Each quiz has up to 15 questions. Users have 30 seconds per question by default.
- The quiz runs in fullscreen mode. Exiting fullscreen or switching tabs triggers a warning.
- 3 warnings = account blocked (anti-cheating system).
- Each quiz can only be taken ONCE. Results are permanent.
- Questions are available in multiple languages: English, Hindi, Telugu, Tamil, Marathi, Gujarati, Kannada, Malayalam, Bengali, Spanish.
- After completing the quiz, users see their score, can download a PDF report, and can review their answers.
- After completing, users can spin the Spin & Win wheel to win bonus cash (₹1, ₹5, ₹10, free scratch card, or Bad Luck).
- Spin & Win is available once per quiz. Winnings go directly to the Referral Wallet.

=== TOURNAMENTS ===
- Tournaments are special competitions with prize pools (₹500–₹10,000+).
- Users must pay an entry fee to join (shown per tournament).
- There are Live Mega Tournaments with big prize pools.
- Tournament results are on the Leaderboard under the "Tournament" tab.
- Winnings are credited to the wallet within 24–48 hours after the tournament ends.

=== LEADERBOARD ===
- Shows rankings of all users by score. Two tabs: Overall and By Tournament.
- Top performers win prizes. Rank is recalculated after every quiz completion.

=== USER DASHBOARD ===
- Access at /user. Tabs: Overview, Achievements, Certificates, Payments, Referrals.
- Overview: streak, rank, stats, recent quizzes.
- Achievements: Badges earned. Certificates: PDF certificates. Payments: transaction history. Referrals: referral wallet and link.

=== REFERRAL SYSTEM ===
- Every user gets a unique referral link in their dashboard.
- When someone joins via your link and pays the entry fee, you earn a referral bonus immediately.
- Referral Wallet is separate from the main wallet. Both can be withdrawn.

=== WALLET & WITHDRAWALS ===
- Minimum withdrawal: ₹50. Processed via UPI within 24 hours on working days.
- To withdraw: User Dashboard → Payments tab → Request Withdrawal. Add your UPI ID first.
- Payment issues MUST be escalated to human admin — AI cannot process payments.

=== BLOCKED ACCOUNTS ===
- Accounts blocked for: 3 fullscreen/tab violations, suspicious activity, or IP block.
- To unblock: Pay ₹50 via the unblock page, or submit an appeal.
- Admin reviews appeals within 24–48 hours.

=== COMMON ISSUES & SOLUTIONS ===
Q: I can't see the daily quiz. A: Quiz may not be published yet. Wait for scheduled time or refresh. Must be a paid member.
Q: My score didn't save. A: Check internet. Scores auto-save at end. Refresh — completion is on the server. If unclear after 5 minutes, contact support.
Q: I can't log in. A: Wrong email/username or try clearing cookies. Use "Forgot Password" or contact support.
Q: Spin wheel not showing. A: Only once per quiz. If already spun, it won't reappear.
Q: I referred friends but got no bonus. A: Referee must pay entry fee and complete registration. Check Referrals tab.
Q: Website slow. A: Clear browser cache. Use Chrome or Edge. On mobile, use WiFi.

=== NATIVE MOBILE APP ===
- IQ Earners is available as a native Android and iOS app. 
- Download the APK from the website or find us on the Play Store/App Store (Search: "IQ Earners").
- The app supports Push Notifications for new quizzes and winners.

=== MEMBER ID & PROFILES ===
- Every paid user gets a unique Member ID (e.g., P-00123).
- Member IDs are generated after the first payment and are displayed in the User Dashboard.
- Use your Member ID for all support queries.

=== MULTI-LANGUAGE SUPPORT ===
- We are proud to support 10 Indian and global languages.
- You can switch your preferred language at any time in the Quiz settings or User Dashboard.
- All translations are AI-powered for accuracy and speed.

=== REFUND POLICY ===
- Since this is a digital service with immediate access to earning opportunities, we generally do not offer refunds once the entry fee is paid and the username is created.
- For double-payments or technical errors, please escalate to support.

=== ESCALATION RULES ===
- You MUST escalate (respond only "ESCALATE") for:
- Payment failures, refunds, or deducted-not-credited money.
- Account permanently banned or fraud block appeals.
- Server errors or quiz data loss.
- Legal complaints or privacy data requests.
- Anything requiring access to specific user account data.
- If the user explicitly asks for "Human Support" or "Manual Review".
`

export async function POST(req: Request) {
    try {
        // ── Rate Limit ─────────────────────────────────────────────
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            ?? req.headers.get("x-real-ip") ?? "unknown"
        const now = Date.now()
        const entry = rateMap.get(ip)
        if (entry) {
            if (now - entry.firstAt < RATE_WINDOW_MS) {
                if (entry.count >= RATE_MAX) {
                    return NextResponse.json({ ok: true, escalate: true, rateLimited: true })
                }
                entry.count++
            } else {
                rateMap.set(ip, { count: 1, firstAt: now })
            }
        } else {
            rateMap.set(ip, { count: 1, firstAt: now })
        }

        const body = await req.json().catch(() => null)
        if (!body || !body.message) {
            return NextResponse.json({ ok: false, error: "No message provided" }, { status: 400 })
        }

        const userMessage = String(body.message || "").trim().slice(0, 1000)
        const userName = body.name ? String(body.name).trim() : null
        const userSubject = body.subject ? String(body.subject).trim() : null

        const contextNote = [
            userName ? `User's name: ${userName}` : null,
            userSubject ? `Message subject: ${userSubject}` : null,
        ].filter(Boolean).join("\n")

        const userPrompt = `${contextNote ? contextNote + "\n" : ""}User's message: "${userMessage}"

Instructions:
- Answer helpfully and concisely from the knowledge base.
- Reply in the same language as the user (Hindi/Telugu/Tamil etc.).
- If account-specific, payment, or unsure — respond ONLY: ESCALATE
- Keep response under 200 words. Be warm and direct.`

        const aiResult = await chatCompletion([
            { role: "system", content: IQ_EARNERS_KNOWLEDGE },
            { role: "user", content: userPrompt }
        ], { temperature: 0.3, max_tokens: 512 })

        if (!aiResult.ok || !aiResult.content) {
            return NextResponse.json({ ok: true, escalate: true })
        }

        const reply = aiResult.content.trim()
        const upperReply = reply.toUpperCase()
        if (upperReply === "ESCALATE" || upperReply.startsWith("ESCALATE") || upperReply.includes("\nESCALATE")) {
            return NextResponse.json({ ok: true, escalate: true })
        }

        const cleanReply = reply.replace(/\bESCALATE\b/gi, "").trim()
        if (!cleanReply) return NextResponse.json({ ok: true, escalate: true })

        return NextResponse.json({ ok: true, escalate: false, reply: cleanReply })
    } catch {
        return NextResponse.json({ ok: true, escalate: true })
    }
}

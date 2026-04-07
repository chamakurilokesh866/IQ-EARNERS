import { NextResponse } from "next/server"
import { getApplicationByEmail, saveApplication, type CreatorApplication } from "@/lib/creators"
import { chatCompletion } from "@/lib/aiGateway"

export async function POST(req: Request) {
    try {
        const { email, otp, platform, handle, type, cvUrl } = await req.json()
        const app = await getApplicationByEmail(email)

        if (!app || app.otp !== otp || (app.otpExpiresAt && app.otpExpiresAt < Date.now())) {
            return NextResponse.json({ ok: false, error: "Invalid or expired OTP" }, { status: 400 })
        }

        app.platform = platform || app.platform
        app.handle = handle || app.handle
        app.type = type
        app.cvUrl = cvUrl
        app.status = "pending"
        app.updated_at = Date.now()

        const followers = app.followers || 0 // Use the discovered count

        // ── AI Validation ──────────────────────────────────────────
        const validationPrompt = `
You are the IQ Earners Admin AI. Validate this creator application:
Name: ${app.name}
Platform: ${platform}
Handle: ${handle}
Followers: ${followers}
Type: ${type}
CV: ${cvUrl || "No CV"}

Conditions for auto-approval:
1. Followers count MUST be > 5000.
2. If followers are high enough, approve.
3. If type is "partner", analyze the CV (mocked if not provided) and suggest a role (e.g., Marketing Manager, Content Creator, Social Media Strategist).

Response JSON:
{
  "approved": boolean,
  "feedback": "string explaining reasoning",
  "suggestedRole": "string (only if partner)"
}
`

        const aiResult = await chatCompletion([
            { role: "system", content: "You are the IQ Earners Admin AI." },
            { role: "user", content: validationPrompt }
        ], { temperature: 0.2, max_tokens: 512 })

        if (aiResult.ok && aiResult.content) {
            try {
                const cleanedContent = aiResult.content.replace(/```json/g, "").replace(/```/g, "").trim()
                const parsed = JSON.parse(cleanedContent)
                app.status = parsed.approved ? "approved" : "rejected"
                app.adminFeedback = parsed.feedback
                app.suggestedRole = parsed.suggestedRole || ""
            } catch {
                app.status = followers > 5000 ? "approved" : "rejected"
                app.adminFeedback = followers > 5000 ? "Auto-approved based on followers count." : "Followers count below 5k threshold."
            }
        } else {
            app.status = followers > 5000 ? "approved" : "rejected"
            app.adminFeedback = followers > 5000 ? "Auto-approved (system fallback)." : "Followers count below threshold."
        }

        // ── Provision Creator Profile if Approved ────────────────────
        if (app.status === "approved") {
            const { saveCreator } = await import("@/lib/creators")
            await saveCreator({
                uid: app.id,
                email: app.email,
                handle: app.handle,
                platform: app.platform,
                role: app.suggestedRole || "Creator",
                isApproved: true,
                wallet: 0,
                referrals: 0,
                creatorType: app.type,
                created_at: Date.now()
            })
        }

        await saveApplication(app)

        return NextResponse.json({ ok: true, status: app.status })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
}

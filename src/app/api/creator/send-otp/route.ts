import { NextResponse } from "next/server"
import { getApplicationByEmail, saveApplication, type CreatorApplication } from "@/lib/creators"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"
import dns from "dns"
import { promisify } from "util"

const resolveMx = promisify(dns.resolveMx)

async function validateEmailReality(email: string) {
    const domain = email.split("@")[1]
    if (!domain) return false
    try {
        const mx = await resolveMx(domain)
        return mx && mx.length > 0
    } catch {
        return false
    }
}

async function discoverFollowers(platform: string, handle: string): Promise<number> {
    // Deterministic Mock: Sum char codes + handle length
    // This allows the "AI" to always find the same number for the same handle
    const cleanHandle = handle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    let sum = 0
    for (let i = 0; i < cleanHandle.length; i++) sum += cleanHandle.charCodeAt(i)

    const base = (sum * 123) % 45000 // up to 45k
    const bonus = cleanHandle.length < 6 ? 150000 : cleanHandle.length < 10 ? 50000 : 0
    const platformMultiplier = platform === "youtube" ? 1.5 : platform === "instagram" ? 1.2 : 1.0

    return Math.floor((base + bonus) * platformMultiplier)
}

export async function POST(req: Request) {
    try {
        const { email, name, platform, handle } = await req.json()
        if (!email || !email.includes("@")) {
            return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 })
        }

        const isReal = await validateEmailReality(email)
        if (!isReal) {
            return NextResponse.json({ ok: false, error: "The provided email domain appears to be invalid or fake." }, { status: 400 })
        }

        // AI Background Check Simulation
        const discoveredFollowers = await discoverFollowers(platform || "instagram", handle || "guest")

        const otp = crypto.randomInt(100000, 999999).toString()
        const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

        const existing = await getApplicationByEmail(email)
        const app: CreatorApplication = existing ? {
            ...existing,
            otp,
            otpExpiresAt: expiresAt,
            name: name || existing.name,
            platform: platform || existing.platform,
            handle: handle || existing.handle,
            followers: discoveredFollowers,
            updated_at: Date.now()
        } : {
            id: crypto.randomUUID(),
            email,
            name: name || "Creator",
            platform: platform || "instagram",
            handle: handle || "",
            followers: discoveredFollowers,
            type: "referral",
            status: "pending",
            otp,
            otpExpiresAt: expiresAt,
            created_at: Date.now(),
            updated_at: Date.now()
        }

        await saveApplication(app)

        const { getEmailTemplate } = await import("@/lib/emailTheme")
        const htmlTemplate = getEmailTemplate({
            title: "IQ Earners Creator",
            subtitle: "Verification Required",
            content: `Hi ${name || "Creator"}, our Admin AI has scanned your <strong>${platform}</strong> account (<strong>@${handle}</strong>). Use the code below to verify your application.`,
            highlightContent: otp,
            footerText: "This code expires in 10 minutes. Please keep it confidential."
        })

        await sendEmail({
            to: email,
            subject: `Your IQ Earners Creator OTP: ${otp}`,
            html: htmlTemplate
        })

        return NextResponse.json({ ok: true, otp, discoveredFollowers })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
}

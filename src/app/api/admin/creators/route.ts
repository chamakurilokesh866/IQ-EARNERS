import { NextResponse } from "next/server"
import { getApplications, saveApplication, getCreators, saveCreator, type CreatorProfile } from "@/lib/creators"
import { getRole } from "@/lib/auth"
import crypto from "crypto"

export async function GET(req: Request) {
    if (await getRole() !== "admin") return NextResponse.json({ ok: false }, { status: 401 })

    const applications = await getApplications()
    const creators = await getCreators()

    return NextResponse.json({ ok: true, applications, creators })
}

export async function POST(req: Request) {
    if (await getRole() !== "admin") return NextResponse.json({ ok: false }, { status: 401 })

    const body = await req.json()
    const { action, email, feedback, role } = body

    const app = (await getApplications()).find(a => a.email === email)
    if (!app) return NextResponse.json({ ok: false, error: "App not found" }, { status: 404 })

    if (action === "approve") {
        app.status = "approved"
        app.adminFeedback = feedback || "Approved by Admin"
        await saveApplication(app)

        const creator: CreatorProfile = {
            uid: crypto.randomBytes(8).toString("hex"),
            email: app.email,
            handle: app.handle,
            platform: app.platform,
            role: role || app.suggestedRole || "Creator Partner",
            isApproved: true,
            wallet: 0,
            referrals: 0,
            creatorType: app.type,
            created_at: Date.now()
        }
        await saveCreator(creator)
    } else if (action === "reject") {
        app.status = "rejected"
        app.adminFeedback = feedback || "Rejected by Admin"
        await saveApplication(app)
    }

    return NextResponse.json({ ok: true })
}

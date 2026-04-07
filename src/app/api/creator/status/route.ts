import { NextResponse } from "next/server"
import { getApplicationByEmail } from "@/lib/creators"

export async function POST(req: Request) {
    try {
        const { email } = await req.json()
        if (!email || !email.includes("@")) {
            return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 })
        }

        const app = await getApplicationByEmail(email)
        if (!app) {
            return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 })
        }

        return NextResponse.json({
            ok: true,
            status: app.status,
            feedback: app.adminFeedback,
            platform: app.platform,
            handle: app.handle,
            suggestedRole: app.suggestedRole
        })
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
}

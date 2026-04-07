import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { sendPushNotification } from "@/lib/push"
import { audit } from "@/lib/audit"

export async function POST(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    const body = await req.json().catch(() => ({}))
    const title = body?.title || "Update from IQ Earners"
    const message = body?.message || "Check out the latest updates!"
    const url = body?.url || "/home"

    if (!message) return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 })

    const result = await sendPushNotification({
        title,
        body: message,
        url
    })

    await audit(req, "admin.broadcast", { title, message, url, sent: result.sent })

    return NextResponse.json({ ok: true, sent: result.sent })
}

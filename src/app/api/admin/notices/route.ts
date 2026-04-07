import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const DATA_PATH = path.join(process.cwd(), "src", "data", "admin_notices.json")

async function getNotices() {
    try {
        const txt = await fs.readFile(DATA_PATH, "utf-8")
        return JSON.parse(txt || "[]")
    } catch {
        return []
    }
}

export async function GET() {
    const data = await getNotices()
    return NextResponse.json({ ok: true, data })
}

export async function POST(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    const body = await req.json().catch(() => ({}))
    const notice = {
        id: String(Date.now()),
        title: body.title || "Announcement",
        message: body.message,
        type: "admin",
        link: body.link || "/home",
        createdAt: Date.now()
    }

    if (!notice.message) return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 })

    const notices = await getNotices()
    notices.unshift(notice)
    // Keep only latest 5
    const limited = notices.slice(0, 5)

    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(limited, null, 2), "utf-8")

    // Also send a push notification for the notice!
    const { sendPushNotification } = await import("@/lib/push")
    await sendPushNotification({
        title: notice.title,
        body: notice.message,
        url: notice.link
    }).catch(() => { })

    return NextResponse.json({ ok: true, notice })
}

export async function DELETE(req: Request) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ ok: false, error: "ID required" }, { status: 400 })

    let notices = await getNotices()
    notices = notices.filter((n: any) => n.id !== id)
    await fs.writeFile(DATA_PATH, JSON.stringify(notices, null, 2), "utf-8")
    return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSettings, updateSettings } from "@/lib/settings"

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies()
        const uid = cookieStore.get("uid")?.value
        if (!uid) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 })

        const body = await req.json().catch(() => ({}))
        const token = String(body?.token ?? "").trim()
        const platform = String(body?.platform ?? "unknown").trim()

        if (!token) return NextResponse.json({ ok: false, error: "No token" }, { status: 400 })
        if (token.length < 20 || token.includes(" ") || !/^[A-Za-z0-9_-]+:?[A-Za-z0-9_-]*$/.test(token)) {
            return NextResponse.json({ ok: false, error: "Invalid token format" }, { status: 400 })
        }

        // Store device tokens in settings (keyed by uid)
        const settings = await getSettings()
        const deviceTokens: Record<string, { token: string; platform: string; updatedAt: number }> =
            ((settings as any)?.deviceTokens) ?? {}

        deviceTokens[uid] = { token, platform, updatedAt: Date.now() }

        await updateSettings({ deviceTokens } as any)

        return NextResponse.json({ ok: true })
    } catch (e) {
        return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
    }
}

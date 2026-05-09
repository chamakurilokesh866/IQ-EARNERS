import { promises as fs } from "fs"
import path from "path"
// @ts-expect-error: web-push does not have types installed
import type { PushSubscription } from "web-push"

const SUBS_PATH = path.join(process.cwd(), "src", "data", "push_subscriptions.json")

async function getSubscriptions(): Promise<PushSubscription[]> {
    try {
        const txt = await fs.readFile(SUBS_PATH, "utf-8")
        const arr = JSON.parse(txt || "[]")
        return Array.isArray(arr) ? arr : []
    } catch {
        return []
    }
}

async function saveSubscriptions(subs: PushSubscription[]): Promise<void> {
    try {
        await fs.mkdir(path.dirname(SUBS_PATH), { recursive: true })
        await fs.writeFile(SUBS_PATH, JSON.stringify(subs, null, 2), "utf-8")
    } catch (err) {
        console.error("Failed to save push subscriptions:", err)
    }
}

export async function sendPushNotification(payload: { title: string; body: string; url?: string }) {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY ?? ""
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY ?? ""

    if (!vapidPublic || !vapidPrivate) {
        console.warn("VAPID keys not configured. Cannot send push notifications.")
        return { ok: false, error: "VAPID_MISSING" }
    }

    let webpush
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        webpush = require("web-push")
        webpush.setVapidDetails("mailto:iqearnersteam@gmail.com", vapidPublic, vapidPrivate)
    } catch {
        console.warn("web-push not installed.")
        return { ok: false, error: "WEB_PUSH_MISSING" }
    }

    const subs = await getSubscriptions()
    if (!subs.length) return { ok: true, sent: 0 }

    const data = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/home",
        timestamp: Date.now()
    })

    let sent = 0
    const failed: string[] = []

    const promises = subs.map(async (sub) => {
        try {
            await webpush.sendNotification(sub, data, { TTL: 60 * 60 * 4 })
            sent++
        } catch (err: any) {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
                failed.push(sub.endpoint)
            }
        }
    })

    await Promise.allSettled(promises)

    if (failed.length > 0) {
        const remaining = subs.filter((s) => !failed.includes(s.endpoint))
        await saveSubscriptions(remaining)
    }

    return { ok: true, sent }
}

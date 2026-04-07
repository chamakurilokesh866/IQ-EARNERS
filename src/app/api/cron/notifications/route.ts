import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { sendPushNotification } from "@/lib/push"

const DATA_PATH = path.join(process.cwd(), "src", "data", "last_push_time.json")

async function getLastPushTime() {
    try {
        const txt = await fs.readFile(DATA_PATH, "utf-8")
        const data = JSON.parse(txt || "{}")
        return typeof data.timestamp === "number" ? data.timestamp : 0
    } catch {
        return 0
    }
}

async function updateLastPushTime(ts: number) {
    try {
        await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
        await fs.writeFile(DATA_PATH, JSON.stringify({ timestamp: ts }), "utf-8")
    } catch { }
}

export async function GET(req: Request) {
    const url = new URL(req.url)
    const force = url.searchParams.get("force") === "1"
    const now = Date.now()
    const last = await getLastPushTime()
    const fourHoursMs = 1000 * 60 * 60 * 4

    if (!force && now - last < fourHoursMs) {
        return NextResponse.json({ ok: true, message: "Skipped (too soon)", nextSendAt: last + fourHoursMs })
    }

    // Choose a random message for variety
    const messages = [
        "🚀 Ready for a challenge? New quizzes are waiting!",
        "🏆 Tournaments are heating up! Join now and climb the leaderboard.",
        "💰 Earn more today! Complete your daily quiz and claim rewards.",
        "🎯 Stay sharp! A fresh set of questions is ready for you.",
        "🔥 Don't let your streak die! Play your daily quiz now."
    ]
    const randomMsg = messages[Math.floor(Math.random() * messages.length)]

    const result = await sendPushNotification({
        title: "IQ Earners Update",
        body: randomMsg,
        url: "/daily-quiz"
    })

    if (result.ok) {
        await updateLastPushTime(now)
    }

    return NextResponse.json({ ok: true, sent: result.sent })
}

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { rateLimit } from "@/lib/rateLimit"
import { recordInspectAlert, blockIp, getClientIp, getRecentInspectAlertCount } from "@/lib/inspectSecurity"
import { getProfileByUid } from "@/lib/profiles"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  // Rate limit the security endpoint itself to prevent abuse/DoS
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limited" }, { status: 429 })

  try {
    const body = await req.json().catch(() => ({}))
    const pageUrl = typeof body?.url === "string" ? body.url.slice(0, 2000) : ""
    const type = typeof body?.type === "string" ? body.type.slice(0, 200) : "general"
    let username = ""
    try {
      const store = await cookies()
      const uid = store.get("uid")?.value ?? ""
      if (uid) {
        const profile = await getProfileByUid(uid)
        username = profile?.username ?? ""
      }
      if (!username) {
        const v = store.get("username")?.value
        if (v) username = decodeURIComponent(v.trim())
      }
    } catch { }
    const ok = await recordInspectAlert(req, { username, page_url: pageUrl })

    const ip = getClientIp(req)
    const reason = `Security violation detected (${type || "general"})`
    const autoBlock = Boolean(body?.autoBlock)
    const strikes = await getRecentInspectAlertCount(ip, 30 * 60 * 1000)
    const shouldBlock = autoBlock || strikes >= 3
    if (shouldBlock) {
      await blockIp(ip, undefined, reason)
    }

    // Proactive Admin Notification
    if (ok) {
      try {
        const { sendPushNotification } = await import("@/lib/push")
        await sendPushNotification({
          title: "🛡️ Security Incident: DevTools Detected",
          body: `User: ${username || "Anonymous"}\nIP: ${ip}\nType: ${type}\nURL: ${pageUrl.slice(0, 50)}...`,
          url: "/more/admin-dashboard?tab=Reports"
        })
      } catch { }
    }

    return NextResponse.json({
      ok,
      blocked: shouldBlock,
      strikes,
      warningsBeforeBlock: 2,
      warningsRemaining: Math.max(0, 2 - Math.min(2, strikes)),
    })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

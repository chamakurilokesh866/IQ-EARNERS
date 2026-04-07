import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSettings } from "@/lib/settings"
import { getProfiles } from "@/lib/profiles"
import { getPayments } from "@/lib/payments"
import { getTournaments } from "@/lib/tournaments"
import { getEnrollmentsByUsername } from "@/lib/enrollments"
import { isBlocked } from "@/lib/blocked"
import { rateLimit } from "@/lib/rateLimit"
import { isUserSessionValid } from "@/lib/activeSessions"

export async function GET(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  try {
    const cookieStore = await cookies()
    const uid = cookieStore.get("uid")?.value ?? ""
    const sid = cookieStore.get("sid")?.value ?? ""
    let sessionOk = true
    if (uid && sid) {
      try {
        sessionOk = await isUserSessionValid(uid, sid)
      } catch (e) {
        if (process.env.NODE_ENV === "development") console.warn("[bootstrap] session check error, allowing request:", e)
        sessionOk = true
      }
    }
    if (uid && sid && !sessionOk) {
      // 200 avoids browser "Failed to load resource" noise; client handles sessionInvalid.
      return NextResponse.json(
        { ok: false, sessionInvalid: true },
        { status: 200, headers: { "Cache-Control": "private, no-store, must-revalidate" } }
      )
    }
    const paidCookie = cookieStore.get("paid")?.value === "1"
    let usernameCookie = ""
    try { usernameCookie = decodeURIComponent(cookieStore.get("username")?.value ?? "") } catch { }
    const [profiles, payments, settings, tournaments] = await Promise.all([
      getProfiles() as Promise<any[]>,
      getPayments() as Promise<any[]>,
      getSettings() as Promise<any>,
      getTournaments() as Promise<any[]>
    ])
    // Safeguard for missing/invalid data
    const safeProfiles = Array.isArray(profiles) ? profiles : []
    const safePayments = Array.isArray(payments) ? payments : []
    const safeSettings = settings || {}
    const safeTournaments = Array.isArray(tournaments) ? tournaments : []

    let me = safeProfiles.find((p) => p.uid === uid)
    if (!me && usernameCookie) {
      const byUsername = safeProfiles.find((p) => String(p.username || "").toLowerCase() === usernameCookie.toLowerCase())
      if (byUsername && (byUsername.paid === "P" || byUsername.memberId)) {
        me = byUsername
      }
    }

    const username = me?.username ?? usernameCookie
    const blockedEntry = username ? await isBlocked(username) : null
    
    if (blockedEntry) {
      return NextResponse.json({
        ok: true,
        data: { username: null, paid: false, entryFee: 100 },
        blocked: true,
        blockKey: "B",
        blockReason: blockedEntry.reason || "Your account has been blocked.",
        blockUsername: blockedEntry.username
      }, { status: 200, headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" } })
    }

    const hasPaidPayment = safePayments.some((p) =>
      p.status === "success" &&
      (p.profileId === uid || (username && String(p?.meta?.username ?? p?.meta?.name ?? p?.meta?.customerName ?? "").toLowerCase() === username.toLowerCase()))
    )
    
    const hasPaidProfile = !!me || (username && safeProfiles.some((p) => String(p.username || "").toLowerCase() === username.toLowerCase() && (p.paid === "P" || p.memberId)))
    
    let paid = !!me || hasPaidPayment || hasPaidProfile
    const round = Number(safeSettings?.round ?? 1)
    const prizeCompleted = Boolean(safeSettings?.prizeCompleted)
    
    let enrollment: any = null
    let enrollments: any[] = []
    
    try {
      const userEnrollments = username ? await getEnrollmentsByUsername(username) : []
      enrollments = userEnrollments.map((e) => {
        const t = safeTournaments.find((x) => x.id === e.tournamentId)
        return {
          tournamentId: e.tournamentId,
          tournamentTitle: t?.title ?? e.tournamentId,
          uniqueCode: e.uniqueCode
        }
      })
      if (enrollments.length > 0) {
        enrollment = enrollments[0]
        if (round >= 2) paid = true
      }
    } catch (e) {
      console.error("[bootstrap] Enrollment fetch failed:", e)
    }

    const entryFee = Number(safeSettings?.entryFee ?? 100)
    const targetAudience = Math.max(1, Number(safeSettings?.targetAudience ?? 100))
    const baseCount = Math.max(0, Number(safeSettings?.progressBaseCount ?? 0))
    const paidCount = safePayments.filter((p) => p.status === "success").length
    const effectiveCount = Math.max(0, paidCount - baseCount)
    const progressPct = Math.min(100, Math.round((effectiveCount / targetAudience) * 100))
    
    const data = {
      username, paid, entryFee, round, prizeCompleted, enrollment, enrollments, progressPct, targetAudience,
      country: me?.country,
      memberId: me?.memberId,
      navbarLayout: (safeSettings?.navbarLayout === "horizontal" ? "horizontal" : "vertical") as "horizontal" | "vertical",
      vipModalEnabled: Boolean(safeSettings?.vipModalEnabled),
      vipModalImage: safeSettings?.vipModalImage,
      vipModalLink: safeSettings?.vipModalLink,
      vipModalTitle: safeSettings?.vipModalTitle,
      vipModalButtonText: safeSettings?.vipModalButtonText
    }

    return NextResponse.json({ ok: true, data }, { 
      status: 200,
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" } 
    })
  } catch (err) {
    console.error("[bootstrap] Fatal crash:", err)
    return NextResponse.json({ 
      ok: false, 
      error: "Initialization failed",
      data: { username: "", paid: false, entryFee: 100 } 
    }, { 
      status: 200, // Still return 200 to allow front-end to handle gracefully
      headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0" } 
    })
  }
}

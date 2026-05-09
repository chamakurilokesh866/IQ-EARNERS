import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { blockUser, isBlocked } from "@/lib/blocked"
import { getUserStats, setUserStats, type UserStatsData } from "@/lib/userStats"
import { rateLimit } from "@/lib/rateLimit"

const MAX_STRIKES = 3

async function getUsername(): Promise<string | null> {
  try {
    const store = await cookies()
    const v = store.get("username")?.value
    if (!v) return null
    return decodeURIComponent(v.trim())
  } catch {
    return null
  }
}

/**
 * Records one quiz integrity warning server-side. Blocks the account only after MAX_STRIKES
 * warnings in the same quiz session (same quizId).
 */
export async function POST(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })

  const username = await getUsername()
  if (!username) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const existing = await isBlocked(username)
  if (existing) {
    return NextResponse.json({ ok: true, strikes: MAX_STRIKES, blocked: true, blockReason: existing.reason })
  }

  const body = await req.json().catch(() => ({}))
  const reason = String(body?.reason ?? "Quiz integrity violation.")
  const quizId = String(body?.quizId ?? "daily").trim() || "daily"

  const raw = (await getUserStats(username)) ?? {}
  let strikes = Number(raw.integrityStrikes ?? 0)
  let storedQid = raw.integrityStrikesQuizId ?? ""

  if (storedQid !== quizId) {
    strikes = 0
    storedQid = quizId
  }

  strikes += 1

  const patch: UserStatsData = {
    ...raw,
    integrityStrikes: strikes,
    integrityStrikesQuizId: storedQid
  }

  if (strikes < MAX_STRIKES) {
    const ok = await setUserStats(username, patch)
    if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
    return NextResponse.json({ ok: true, strikes, blocked: false })
  }

  const fullReason = `${reason} Pay ₹50 to unblock.`
  await blockUser(username.trim(), fullReason)
  await setUserStats(username, {
    ...raw,
    integrityStrikes: 0,
    integrityStrikesQuizId: undefined
  })

  const res = NextResponse.json({ ok: true, strikes: MAX_STRIKES, blocked: true, username: username.trim() })
  res.cookies.set("blocked", "B", { path: "/", maxAge: 60 * 60 * 24, httpOnly: false })
  res.cookies.set("blocked_username", encodeURIComponent(username.trim()), { path: "/", maxAge: 60 * 60 * 24, httpOnly: false })
  return res
}

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfiles } from "@/lib/profiles"
import { getLeaderboard } from "@/lib/leaderboard"
import { getUpiRequestState, setUpiRequestState } from "@/lib/upiRequests"

async function getUsername(): Promise<string | null> {
  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  let usernameCookie = ""
  try {
    usernameCookie = decodeURIComponent(cookieStore.get("username")?.value ?? "")
  } catch {}
  if (usernameCookie) return usernameCookie
  const profiles = await getProfiles()
  const p = profiles.find((x: any) => x?.uid === uid)
  return p?.username ?? null
}


async function getLeaderboardSorted(): Promise<{ name: string; rank: number }[]> {
  const arr = await getLeaderboard()
  if (!arr.length) return []
  const sorted = [...arr].sort((a: any, b: any) => {
    if (b.score !== a.score) return b.score - a.score
    const ta = a.totalTimeSeconds ?? Infinity
    const tb = b.totalTimeSeconds ?? Infinity
    return ta - tb
  })
  return sorted.map((e: any, i: number) => ({ name: String(e?.name ?? "").trim(), rank: i + 1 }))
}

function matchUsername(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export async function GET() {
  const username = await getUsername()
  if (!username) return NextResponse.json({ ok: true, data: null })
  const data = await getUpiRequestState()
  if (!data.active || data.active.status !== "sent") return NextResponse.json({ ok: true, data: null })
  if (!matchUsername(data.active.targetUsername, username)) return NextResponse.json({ ok: true, data: null })
  return NextResponse.json({ ok: true, data: data.active })
}

export async function POST(req: Request) {
  const username = await getUsername()
  if (!username) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const action = body?.action === "pass" ? "pass" : body?.action === "send" ? "send" : null
  if (!action) return NextResponse.json({ ok: false, error: "action required: pass or send" }, { status: 400 })
  const upiId = action === "send" && typeof body?.upiId === "string" ? body.upiId.trim() : ""
  if (action === "send" && !upiId) return NextResponse.json({ ok: false, error: "upiId required when sending" }, { status: 400 })

  const data = await getUpiRequestState()
  if (!data.active || data.active.status !== "sent") {
    return NextResponse.json({ ok: false, error: "No active request" }, { status: 400 })
  }
  if (!matchUsername(data.active.targetUsername, username)) {
    return NextResponse.json({ ok: false, error: "This request is not for you" }, { status: 403 })
  }

  const historyEntry = {
    ...data.active,
    status: action === "pass" ? "passed" : "completed",
    upiId: action === "send" ? upiId : undefined,
    action,
    respondedAt: Date.now()
  }
  const newHistory = [historyEntry, ...(data.history || [])]

  let newActive: any = null
  let newPendingNext: any = null

  if (action === "pass") {
    const leaderboard = await getLeaderboardSorted()
    const currentIdx = leaderboard.findIndex((e) => matchUsername(e.name, username))
    const nextRank = currentIdx >= 0 ? currentIdx + 2 : 2
    const nextIdx = nextRank - 1
    const nextUser = nextIdx < leaderboard.length ? leaderboard[nextIdx] : null
    if (nextUser?.name) {
      newPendingNext = { targetUsername: nextUser.name, message: data.active.message, rank: nextUser.rank }
    }
  }

  const ok = await setUpiRequestState({
    active: newActive,
    pendingNext: newPendingNext,
    history: newHistory
  })
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })

  return NextResponse.json({ ok: true, data: { action, pendingNext: newPendingNext } })
}

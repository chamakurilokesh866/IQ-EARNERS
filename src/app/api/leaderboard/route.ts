import { NextResponse } from "next/server"
import { requireAdmin, getUid } from "@/lib/auth"
import { rateLimit } from "@/lib/rateLimit"
import { getProfileByUsername } from "@/lib/profiles"
import { getLeaderboard, upsertByName, replaceAll } from "@/lib/leaderboard"
import { flagUnusuallyFastScore } from "@/lib/smartIntegrity"
import { logIntegrityEventServer } from "@/lib/integrityLogger"
import { chatCompletion } from "@/lib/aiGateway"

function sortLeaderboard(entries: { name: string; score: number; totalTimeSeconds?: number; country?: string; id?: string; tournamentId?: string }[]): (typeof entries[0] & { rank: number })[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const ta = a.totalTimeSeconds ?? Infinity
    const tb = b.totalTimeSeconds ?? Infinity
    return ta - tb
  })
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }))
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tournamentId = url.searchParams.get("tournamentId") || undefined
  const data = await getLeaderboard(tournamentId)
  const ranked = sortLeaderboard(data)
  return NextResponse.json({ ok: true, data: ranked }, {
    headers: { "Cache-Control": "public, max-age=2, stale-while-revalidate=5" }
  })
}

export async function POST(req: Request) {
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  const body = await req.json().catch(() => ({}))
  if (Array.isArray(body?.players)) {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    const valid = body.players.every((p: any) => typeof p?.name === "string" && typeof p?.score === "number")
    if (!valid) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
    const entries = body.players.map((p: any, i: number) => ({
      id: p.id ?? `lb-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(p.name).trim(),
      score: Number(p.score),
      totalTimeSeconds: p.totalTimeSeconds,
      country: p.country,
      tournamentId: p.tournamentId
    }))
    const ok = await replaceAll(entries)
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
  }
  if (body?.item && typeof body.item.name === "string" && typeof body.item.score === "number") {
    const auth = await requireAdmin()
    const uid = await getUid()
    if (!auth.ok && !uid) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    let totalTimeSeconds = typeof body.item.totalTimeSeconds === "number" ? body.item.totalTimeSeconds : (typeof body.item.totalTimeMs === "number" ? body.item.totalTimeMs / 1000 : undefined)
    const totalQuestions = typeof body.item.total === "number" ? body.item.total : undefined
    if (totalTimeSeconds != null) {
      if (totalTimeSeconds < 0 || totalTimeSeconds > 7200) {
        return NextResponse.json({ ok: false, error: "Invalid completion time." }, { status: 400 })
      }
      if (totalQuestions != null && totalQuestions > 0 && totalTimeSeconds < totalQuestions * 2) {
        return NextResponse.json({ ok: false, error: "Invalid completion time (anti-cheat)." }, { status: 400 })
      }
    }
    let name = body.item.name.trim()
    if (!auth.ok && uid) {
      const { getProfileByUid: getProf } = await import("@/lib/profiles")
      const prof = await getProf(uid)
      if (prof?.username) name = prof.username
    }
    const tournamentId = body.item.tournamentId && String(body.item.tournamentId).trim() ? String(body.item.tournamentId).trim() : undefined
    const score = body.item.score
    const flag = totalQuestions != null && totalQuestions > 0 && totalTimeSeconds != null
      ? flagUnusuallyFastScore(score, totalQuestions, totalTimeSeconds)
      : { flagged: false }
    if (flag.flagged) {
      const reason = "reason" in flag ? flag.reason : "Unusually fast high score"
      await logIntegrityEventServer("fast_score_flagged", reason ?? "Unusually fast high score", {
        name,
        score,
        total: totalQuestions,
        totalTimeSeconds,
        level: "level" in flag ? flag.level : undefined,
        deviceFingerprint: body.item.deviceFingerprint
      }, name)
    }
    let country = body.item.country
    if (!country) {
      const prof = await getProfileByUsername(name)
      country = prof?.country
    }
    const item = { name, score: body.item.score, totalTimeSeconds, country, tournamentId }
    const result = await upsertByName(item)
    if (!result) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })
    const all = await getLeaderboard(tournamentId)
    const ranked = sortLeaderboard(all)
    const rankEntry = ranked.find((e: any) => String(e?.name ?? "").toLowerCase() === name.toLowerCase())

    // AI Smart Anti-Cheat Analysis (Runs async after saving the score so user isn't blocked)
    if (body.item.rows && Array.isArray(body.item.rows) && totalQuestions && score / totalQuestions >= 0.8 && totalTimeSeconds) {
      void (async () => {
        try {
          const prompt = `Analyze this user's quiz performance for cheating or impossible behavior.
User: ${name}
Score: ${score}/${totalQuestions}
Total Time: ${totalTimeSeconds} seconds
Questions and Times taken per question:` + "\n" +
            body.item.rows.map((r: any, i: number) => `Q${i + 1}: Time taken: ${r.timeSec}s, Answered Correctly: ${r.correct}`).join("\n") +
            `\n\nIs there concrete evidence of cheating (e.g., consistently answering long/hard questions in under 1.5 seconds)? Respond strictly with "CHEATING: <reason>" or "LEGIT: <reason>".`

          const aiResult = await chatCompletion([
            { role: "system", content: "You are an anti-cheat expert." },
            { role: "user", content: prompt }
          ])
          if (aiResult.ok && aiResult.content && aiResult.content.startsWith("CHEATING")) {
            await logIntegrityEventServer("ai_behavior_flagged", aiResult.content, { name, score, totalTimeSeconds }, name)
          }
        } catch (e) { }
      })();
    }

    return NextResponse.json({ ok: true, rank: rankEntry?.rank })
  }
  return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
}

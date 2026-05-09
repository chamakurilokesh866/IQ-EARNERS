import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const BADGES: Record<string, { icon: string; label: string; desc: string; check: (stats: any) => boolean }> = {
  first_quiz: {
    icon: "🎯", label: "First Quiz", desc: "Complete your first quiz",
    check: (s) => (s.totalQuizzes ?? 0) >= 1
  },
  perfect_5: {
    icon: "⭐", label: "Perfect 5", desc: "Get 5/5 correct in a quiz",
    check: (s) => !!s.hadPerfect5
  },
  streak_3: {
    icon: "🔥", label: "3-Day Streak", desc: "Complete quizzes 3 days in a row",
    check: (s) => (s.maxStreak ?? s.streak ?? 0) >= 3
  },
  streak_7: {
    icon: "💎", label: "7-Day Streak", desc: "Complete quizzes 7 days in a row",
    check: (s) => (s.maxStreak ?? s.streak ?? 0) >= 7
  },
  top_3: {
    icon: "🏆", label: "Top 3", desc: "Reach top 3 on the leaderboard",
    check: (s) => !!s.reachedTop3
  },
  ten_correct: {
    icon: "🎖️", label: "10 Correct", desc: "Score 10+ correct in one quiz",
    check: (s) => (s.bestScore ?? 0) >= 10
  },
  speed_demon: {
    icon: "⚡", label: "Speed Demon", desc: "Complete a quiz with avg <10s per question",
    check: (s) => !!s.speedDemon
  },
  challenge_king: {
    icon: "👑", label: "Challenge King", desc: "Beat a friend's challenge score",
    check: (s) => !!s.challengeWins && s.challengeWins > 0
  },
  perfect_10: {
    icon: "🌟", label: "Perfect 10", desc: "Get 10/10 correct in a quiz",
    check: (s) => !!s.hadPerfect10
  },
  quiz_master: {
    icon: "🧠", label: "IQ-EARNERS Pro", desc: "Complete 50 quizzes",
    check: (s) => (s.totalQuizzes ?? 0) >= 50
  },
  tournament_winner: {
    icon: "🏅", label: "Tournament Winner", desc: "Win a tournament",
    check: (s) => !!s.tournamentWins && s.tournamentWins > 0
  },
  streak_30: {
    icon: "💫", label: "Monthly Warrior", desc: "30-day quiz streak",
    check: (s) => (s.maxStreak ?? s.streak ?? 0) >= 30
  }
}

export async function GET() {
  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  let usernameCookie = ""
  try { usernameCookie = decodeURIComponent(cookieStore.get("username")?.value ?? "") } catch {}

  let userStats: any = null
  if (uid || usernameCookie) {
    try {
      const { getUserStats } = await import("@/lib/userStats")
      userStats = await getUserStats(usernameCookie || uid)
    } catch {}
  }

  const list = Object.entries(BADGES).map(([id, b]) => ({
    id,
    icon: b.icon,
    label: b.label,
    desc: b.desc,
    earned: userStats ? b.check(userStats) : false
  }))

  const earnedCount = list.filter((b) => b.earned).length

  return NextResponse.json({
    ok: true,
    data: list,
    earnedCount,
    totalCount: list.length
  })
}

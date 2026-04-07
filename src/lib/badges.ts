export type Badge = {
    id: string
    name: string
    description: string
    icon: string
    color: string
}

export const BADGES: Record<string, Badge> = {
    PERFECT_SCORE: {
        id: "PERFECT_SCORE",
        name: "Perfect Score",
        description: "Achieved 100% accuracy in a quiz",
        icon: "🎯",
        color: "from-amber-400 to-orange-500"
    },
    SPEED_DEMON: {
        id: "SPEED_DEMON",
        name: "Speed Demon",
        description: "Completed a full quiz in under 60 seconds",
        icon: "⚡",
        color: "from-blue-400 to-cyan-500"
    },
    STREAK_7: {
        id: "STREAK_7",
        name: "7-Day Streak",
        description: "Played for 7 consecutive days",
        icon: "🔥",
        color: "from-red-400 to-rose-500"
    },
    STREAK_30: {
        id: "STREAK_30",
        name: "30-Day Master",
        description: "Maintained a month-long streak",
        icon: "🏆",
        color: "from-purple-400 to-indigo-500"
    },
    EARLY_BIRD: {
        id: "EARLY_BIRD",
        name: "Early Bird",
        description: "Completed a quiz within 15 mins of release",
        icon: "🌅",
        color: "from-emerald-400 to-teal-500"
    },
    CERTIFIED: {
        id: "CERTIFIED",
        name: "Certified Gamer",
        description: "Downloaded your first official certificate",
        icon: "📜",
        color: "from-slate-400 to-slate-600"
    }
}

export function calculateNewBadges(stats: any, currentQuizResult?: { score: number; total: number; timeSeconds: number }): string[] {
    const newBadges: string[] = []
    const existing = new Set(stats.achievements || [])

    // 1. Perfect Score
    if (currentQuizResult && currentQuizResult.score === currentQuizResult.total && currentQuizResult.total > 0) {
        if (!existing.has("PERFECT_SCORE")) newBadges.push("PERFECT_SCORE")
    }

    // 2. Speed Demon
    if (currentQuizResult && currentQuizResult.timeSeconds < 60 && currentQuizResult.total >= 5) {
        if (!existing.has("SPEED_DEMON")) newBadges.push("SPEED_DEMON")
    }

    // 3. Streaks
    if (stats.streak >= 7 && !existing.has("STREAK_7")) newBadges.push("STREAK_7")
    if (stats.streak >= 30 && !existing.has("STREAK_30")) newBadges.push("STREAK_30")

    return newBadges
}

export type QuizModeDefinition = {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  config: Record<string, unknown>
}

export const QUIZ_MODE_DEFAULTS: QuizModeDefinition[] = [
  {
    id: "adaptive",
    name: "AI Adaptive",
    icon: "🧠",
    description:
      "AI adjusts difficulty in real-time based on student performance. Harder questions follow correct answers; easier ones follow mistakes. Personalizes each student's experience.",
    enabled: false,
    config: { initialDifficulty: "medium", adjustmentSpeed: 0.3, minQuestions: 10, maxQuestions: 30 }
  },
  {
    id: "practice",
    name: "Practice Mode",
    icon: "📖",
    description:
      "Unlimited attempts with instant feedback. Shows explanations after each answer. No scoring pressure — perfect for learning and revision.",
    enabled: true,
    config: { showExplanations: true, allowRetry: true, trackProgress: true, timeLimitPerQuestion: 0 }
  },
  {
    id: "mock_exam",
    name: "Mock Exam",
    icon: "📋",
    description:
      "Simulates real exam conditions: timed, no going back, fullscreen enforced. Supports UPSC, SSC, banking exam patterns.",
    enabled: true,
    config: {
      strictTiming: true,
      noBacktrack: true,
      fullscreenRequired: true,
      examPatterns: ["UPSC", "SSC", "Banking", "GATE", "CAT"]
    }
  },
  {
    id: "timed_challenge",
    name: "Timed Challenge",
    icon: "⏱",
    description:
      "Speed-based scoring: faster correct answers = more points. Creates exciting competitive pressure for classroom engagement.",
    enabled: false,
    config: { basePoints: 100, timeDecayRate: 2, bonusStreakMultiplier: 1.5, minTimeBonus: 10 }
  },
  {
    id: "team_quiz",
    name: "Team Quiz",
    icon: "👥",
    description:
      "Students form teams and compete together. Average team score determines ranking. Great for collaborative learning in classrooms.",
    enabled: false,
    config: { minTeamSize: 2, maxTeamSize: 5, scoringMethod: "average", allowChat: true }
  },
  {
    id: "spaced_repetition",
    name: "Spaced Repetition",
    icon: "🔄",
    description:
      "AI schedules review sessions based on forgetting curves. Questions the student struggles with appear more frequently. Science-backed retention improvement.",
    enabled: false,
    config: { initialInterval: 1, easeFactor: 2.5, maxInterval: 30, minReviewCards: 10 }
  },
  {
    id: "battle_royale",
    name: "Battle Royale",
    icon: "⚔️",
    description:
      "All students answer simultaneously. Wrong answer = eliminated. Last person standing wins. Exciting for large groups and events.",
    enabled: false,
    config: { maxPlayers: 100, eliminationMode: "instant", livesPerPlayer: 1, questionTimeLimit: 15 }
  },
  {
    id: "ai_tutor",
    name: "AI Tutor Mode",
    icon: "🤖",
    description:
      "AI acts as a personal tutor: explains concepts, generates follow-up questions on weak areas, and creates personalized study plans.",
    enabled: false,
    config: { model: "auto", maxExplanationLength: 500, generateFollowups: true, difficultyProgression: true }
  }
]

export function mergeQuizModesWithOverrides(
  overrides: Record<string, { enabled?: boolean; config?: Record<string, unknown> }>
): QuizModeDefinition[] {
  return QUIZ_MODE_DEFAULTS.map((m) => {
    const o = overrides[m.id]
    if (!o) return m
    return {
      ...m,
      enabled: typeof o.enabled === "boolean" ? o.enabled : m.enabled,
      config: o.config ? { ...m.config, ...o.config } : m.config
    }
  })
}

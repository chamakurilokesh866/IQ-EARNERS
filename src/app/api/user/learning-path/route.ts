import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid } from "@/lib/profiles"
import { getUserStats } from "@/lib/userStats"

type WeakTopic = {
  topic: string
  attempts: number
  correct: number
  accuracy: number
  recommendation: string
}

const TOPIC_RULES: Array<{ topic: string; re: RegExp; recommendation: string }> = [
  { topic: "Mathematics", re: /\b(algebra|geometry|equation|integral|derivative|triangle|percentage|ratio|probability)\b/i, recommendation: "Practice formula-based and stepwise solving drills for 15 mins daily." },
  { topic: "Science", re: /\b(physics|chemistry|biology|atom|cell|force|energy|reaction|photosynthesis)\b/i, recommendation: "Focus on concept maps and one-line definitions with quick revision quizzes." },
  { topic: "History", re: /\b(history|empire|dynasty|freedom|revolution|war|civilization)\b/i, recommendation: "Use timeline-based revision and cause-effect flashcards." },
  { topic: "Polity", re: /\b(constitution|parliament|amendment|article|fundamental|rights|governor)\b/i, recommendation: "Memorize key articles and solve previous-year polity MCQs." },
  { topic: "Geography", re: /\b(geography|climate|river|mountain|latitude|monsoon|plateau)\b/i, recommendation: "Pair map practice with topic-wise quiz attempts." },
  { topic: "Current Affairs", re: /\b(current affairs|summit|minister|budget|scheme|international|award)\b/i, recommendation: "Do daily current affairs recap and weekly mixed revision tests." }
]

function inferTopic(question: string): string {
  const q = String(question ?? "")
  for (const r of TOPIC_RULES) {
    if (r.re.test(q)) return r.topic
  }
  return "General Knowledge"
}

function recommendationFor(topic: string): string {
  const hit = TOPIC_RULES.find((t) => t.topic === topic)
  return hit?.recommendation ?? "Review mistakes and retry focused quizzes for this topic."
}

async function getAuthenticatedUsername(): Promise<string | null> {
  try {
    const store = await cookies()
    const uid = store.get("uid")?.value ?? ""
    if (uid) {
      const profile = await getProfileByUid(uid)
      if (profile?.username) return profile.username
    }
    const v = store.get("username")?.value
    if (!v) return null
    return decodeURIComponent(v.trim())
  } catch {
    return null
  }
}

export async function GET() {
  const username = await getAuthenticatedUsername()
  if (!username) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 })

  const stats = await getUserStats(username)
  const completedByQuiz = (stats?.completedByQuiz ?? {}) as Record<string, { rows?: Array<{ question?: string; correct?: boolean }> }>
  const bucket = new Map<string, { attempts: number; correct: number }>()

  for (const entry of Object.values(completedByQuiz)) {
    const rows = Array.isArray(entry?.rows) ? entry.rows : []
    for (const row of rows) {
      const topic = inferTopic(String(row?.question ?? ""))
      const current = bucket.get(topic) ?? { attempts: 0, correct: 0 }
      current.attempts += 1
      if (row?.correct) current.correct += 1
      bucket.set(topic, current)
    }
  }

  const weakTopics: WeakTopic[] = Array.from(bucket.entries())
    .map(([topic, v]) => {
      const accuracy = v.attempts > 0 ? Math.round((v.correct / v.attempts) * 100) : 0
      return { topic, attempts: v.attempts, correct: v.correct, accuracy, recommendation: recommendationFor(topic) }
    })
    .filter((x) => x.attempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5)

  return NextResponse.json({ ok: true, data: { weakTopics } })
}

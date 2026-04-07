import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { cookies } from "next/headers"
import { rateLimit } from "@/lib/rateLimit"

const DATA_PATH = path.join(process.cwd(), "src", "data", "question-feedback.json")

async function ensureFile() {
  try {
    await fs.access(DATA_PATH)
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, "[]", "utf-8")
  }
}

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

export async function POST(req: Request) {
  const rl = await rateLimit(req, "feedback")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  await ensureFile()
  const username = await getUsername()
  const body = await req.json().catch(() => ({}))
  const { question, correctAnswer, userAnswer, comment, questionIndex } = body
  if (!question || typeof question !== "string") {
    return NextResponse.json({ ok: false, error: "Question is required" }, { status: 400 })
  }

  const entry = {
    id: "fb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9),
    username: username ?? "guest",
    question: String(question).slice(0, 500),
    correctAnswer: String(correctAnswer ?? "").slice(0, 200),
    userAnswer: String(userAnswer ?? "").slice(0, 200),
    comment: String(comment ?? "").slice(0, 500),
    questionIndex: typeof questionIndex === "number" ? questionIndex : undefined,
    createdAt: Date.now()
  }

  const txt = await fs.readFile(DATA_PATH, "utf-8")
  const arr = JSON.parse(txt || "[]")
  arr.unshift(entry)
  await fs.writeFile(DATA_PATH, JSON.stringify(arr.slice(0, 500), null, 2), "utf-8")

  return NextResponse.json({ ok: true })
}

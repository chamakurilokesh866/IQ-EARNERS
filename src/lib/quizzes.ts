/**
 * Quizzes storage: Supabase (production/Vercel) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "quizzes.json")

export type QuizQuestion = { question: string; options: string[]; correct: number; category?: string; difficulty?: string; explanation?: string }
export type MultiLangQuestion = {
  translations: Record<string, { question: string; options: string[]; correct: number; explanation?: string }>
}
/** Generate a short unique code for a quiz (e.g. DQ-A1B2C3). Used for display and lookup. */
export function generateQuizCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "DQ-"
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

export type Quiz = {
  id: string
  /** Short unique code per quiz (e.g. DQ-A1B2C3). Wired with user completion across devices. */
  code?: string
  title: string
  sourceFile?: string
  source_url?: string
  questions: QuizQuestion[]
  questionsMultiLang?: MultiLangQuestion[]
  /** Manual per-language: one PDF per language, keyed by lang code (en, hi, etc.) */
  questionsByLanguage?: Record<string, QuizQuestion[]>
  languages?: string[]
  rules?: Record<string, string>
  endTime?: string
  token?: string
  created_at?: number
  quiz_type?: "daily" | "tournament"
}

/** Server-side unique token for each quiz (verification / anti-replay) */
export function generateQuizToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
}

async function readFromFile(): Promise<Quiz[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export async function getQuizzes(): Promise<Quiz[]> {
  const supabase = createServerSupabase()
  const fromSupabase: Quiz[] = []
  if (supabase) {
    try {
      const { data, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false })
      if (!error && Array.isArray(data)) {
        data.forEach((r: any) => {
          const q: Quiz = {
            id: r.id,
            code: r.code,
            title: r.title,
            source_url: r.source_url,
            sourceFile: r.source_url,
            questions: Array.isArray(r.questions) ? r.questions : [],
            created_at: r.created_at != null ? Number(r.created_at) : undefined
          }
          if (r.questions_multi_lang?.length && r.languages?.length) {
            q.questionsMultiLang = r.questions_multi_lang
            q.languages = r.languages
          }
          if (r.questions_by_language && typeof r.questions_by_language === "object") {
            q.questionsByLanguage = r.questions_by_language
            if (!q.languages?.length) q.languages = Object.keys(r.questions_by_language)
          }
          if (r.rules && typeof r.rules === "object") q.rules = r.rules
          if (r.end_time) q.endTime = r.end_time
          if (r.token) q.token = r.token
          if (r.quiz_type) q.quiz_type = r.quiz_type
          fromSupabase.push(q)
        })
      }
    } catch {}
  }
  const fromFile = await readFromFile()
  const byId = new Map<string, Quiz>()
  const now = Date.now()
  const ensureCode = (quiz: Quiz): string => {
    if (quiz.code?.trim()) return quiz.code
    const alnum = quiz.id.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    const part = (alnum.slice(-8) || quiz.id.slice(0, 6)).slice(0, 6)
    return `DQ-${part}`
  }
  fromFile.forEach((q) => {
    const quiz = { ...q }
    if (quiz.created_at == null) {
      const idNum = /^\d+$/.test(quiz.id) ? parseInt(quiz.id, 10) : NaN
      quiz.created_at = !isNaN(idNum) && idNum > 1e12 ? idNum : now
    }
    quiz.code = ensureCode(quiz)
    byId.set(quiz.id, quiz)
  })
  fromSupabase.forEach((q) => {
    const quiz = { ...q }
    quiz.code = q.code ?? ensureCode(q)
    byId.set(q.id, quiz)
  })
  return Array.from(byId.values()).sort((a, b) => (b.id > a.id ? 1 : -1))
}

export async function getQuizById(id: string): Promise<Quiz | null> {
  const all = await getQuizzes()
  return all.find((q) => q.id === id) ?? null
}

export async function getQuizByCodeOrId(codeOrId: string): Promise<Quiz | null> {
  const all = await getQuizzes()
  const c = codeOrId.trim().toUpperCase()
  return all.find((q) => q.id === codeOrId || (q.code && q.code.toUpperCase() === c)) ?? null
}

export function getQuestionsForLanguage(quiz: Quiz, lang: string): QuizQuestion[] {
  if (quiz.questionsByLanguage && Object.keys(quiz.questionsByLanguage).length > 0) {
    const list = quiz.questionsByLanguage[lang] ?? quiz.questionsByLanguage[quiz.languages?.[0] ?? "en"]
    return Array.isArray(list) ? list : []
  }
  if (quiz.questionsMultiLang?.length && quiz.languages?.length) {
    const questions: QuizQuestion[] = []
    const preferred = quiz.languages.includes(lang) ? lang : quiz.languages[0]
    for (const mq of quiz.questionsMultiLang) {
      const t = mq.translations[preferred] ?? mq.translations[quiz.languages[0]]
      if (t) questions.push({ ...t, category: "General", difficulty: "Medium" })
    }
    return questions
  }
  return quiz.questions ?? []
}

export type AddQuizResult = { ok: true } | { ok: false; error: string }

export async function addQuiz(quiz: Quiz): Promise<AddQuizResult> {
  const token = quiz.token ?? generateQuizToken()
  const code = quiz.code ?? generateQuizCode()
  const quizWithCode = { ...quiz, code, token }
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const payload: Record<string, unknown> = {
        id: quizWithCode.id,
        title: quizWithCode.title,
        source_url: quizWithCode.source_url ?? quizWithCode.sourceFile ?? "",
        questions: quizWithCode.questions ?? [],
        created_at: Date.now(),
        token,
        code,
        quiz_type: quizWithCode.quiz_type || "daily"
      }
      if (quizWithCode.questionsMultiLang?.length && quizWithCode.languages?.length) {
        payload.questions_multi_lang = quizWithCode.questionsMultiLang
        payload.languages = quizWithCode.languages
      }
      if (quizWithCode.questionsByLanguage && Object.keys(quizWithCode.questionsByLanguage).length > 0) {
        payload.questions_by_language = quizWithCode.questionsByLanguage
        if (!payload.languages) payload.languages = Object.keys(quizWithCode.questionsByLanguage)
      }
      if (quizWithCode.rules && Object.keys(quizWithCode.rules).length > 0) payload.rules = quizWithCode.rules
      if (quizWithCode.endTime) payload.end_time = quizWithCode.endTime
      const { error } = await supabase.from("quizzes").insert(payload)
      if (error) {
        return { ok: false, error: error.message || `Supabase: ${error.code || "insert failed"}` }
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message || "Database error" }
    }
  }
  try {
    const arr = await readFromFile()
    const toAdd = { ...quizWithCode, token: quizWithCode.token ?? token, created_at: Date.now() }
    arr.push(toAdd)
    await fs.mkdir(path.dirname(FILE_PATH), { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message || "File save failed" }
  }
}

export async function updateQuiz(id: string, updates: Partial<Quiz>): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const payload: Record<string, unknown> = {}
      if (updates.title !== undefined) payload.title = updates.title
      if (updates.source_url !== undefined) payload.source_url = updates.source_url
      if (updates.questions !== undefined) payload.questions = updates.questions
      if (updates.questionsMultiLang !== undefined) payload.questions_multi_lang = updates.questionsMultiLang
      if (updates.questionsByLanguage !== undefined) payload.questions_by_language = updates.questionsByLanguage
      if (updates.languages !== undefined) payload.languages = updates.languages
      if (updates.rules !== undefined) payload.rules = updates.rules
      if (updates.endTime !== undefined) payload.end_time = updates.endTime
      if (updates.quiz_type !== undefined) payload.quiz_type = updates.quiz_type
      if (Object.keys(payload).length === 0) return true
      const { error } = await supabase.from("quizzes").update(payload).eq("id", id)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const idx = arr.findIndex((q) => q.id === id)
  if (idx === -1) return false
  arr[idx] = { ...arr[idx], ...updates }
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true }).catch(() => {})
  await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
  return true
}

export async function deleteQuiz(id: string): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", id)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const next = arr.filter((q) => q.id !== id)
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true }).catch(() => {})
  await fs.writeFile(FILE_PATH, JSON.stringify(next, null, 2), "utf-8")
  return true
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin-only: generate quiz questions via NVIDIA NIM API.
 * Token-efficient prompts; output matches admin choices exactly.
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { chatCompletion, isAiConfigured } from "@/lib/aiGateway"
import { getQuizzes } from "@/lib/quizzes"
import { normalizeQuestionStem } from "@/lib/quizQuestionDedupe"

type SingleQuestion = {
  question: string
  options: string[]
  correct: number
  explanation?: string
}

type MultiLangQuestion = {
  translations: Record<string, { question: string; options: string[]; correct: number; explanation?: string }>
}

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const
const QUESTION_TYPES = ["logical", "aptitude", "general_knowledge", "current_affairs", "verbal", "quantitative", "mixed"] as const

/** Fisher-Yates shuffle (deterministic with seed for reproducibility). */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const j = seed % (i + 1)
      ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Department/stream labels for prompt (B.Tech, BiPC, PG). */
const DEPARTMENT_LABELS: Record<string, string> = {
  datascience: "Data Science",
  aiml: "AI & ML",
  cybersecurity: "Cybersecurity",
  cse: "CSE (Computer Science & Engineering)",
  it: "IT (Information Technology)",
  mechanical: "Mechanical Engineering",
  civil: "Civil Engineering",
  eee: "EEE (Electrical & Electronics Engineering)",
  mbbs: "MBBS",
  pharmacy: "Pharmacy",
  nursing: "Nursing",
  physiotherapy: "Physiotherapy",
  mba: "MBA",
  mtech: "M.Tech",
  msc: "M.Sc",
}

/** Build prompt with clear format. Include only constraints admin selected. */
function buildPrompt(
  topic: string,
  count: number,
  languages: string[],
  difficulties: string[],
  questionTypes: string[],
  audienceSegment?: string,
  department?: string,
  schoolClass?: string
): string {
  const multiLang = languages.length > 1
  const langMap: Record<string, string> = {
    en: "English", hi: "Hindi", te: "Telugu", ta: "Tamil", mr: "Marathi",
    gu: "Gujarati", kn: "Kannada", ml: "Malayalam", bn: "Bengali", es: "Spanish"
  }
  const langNames = languages.map((l) => langMap[l] || l).join(", ")

  const constraints: string[] = []
  if (topic.trim()) constraints.push(`Topic: ${topic.trim()}`)
  if (difficulties.length > 0 && difficulties.length < 3)
    constraints.push(`Difficulty: only ${difficulties.join(" or ")}`)
  if (questionTypes.length > 0 && !questionTypes.includes("mixed"))
    constraints.push(`Type: ${questionTypes.join(", ")}`)
  if (audienceSegment === "btech") {
    constraints.push(`Audience: B.Tech/Engineering${department && DEPARTMENT_LABELS[department] ? `, Department/Stream: ${DEPARTMENT_LABELS[department]}` : ""}`)
  } else if (audienceSegment === "pg") {
    constraints.push(`Audience: postgraduate${department && DEPARTMENT_LABELS[department] ? `, Stream: ${DEPARTMENT_LABELS[department]}` : ""}`)
  } else if (audienceSegment === "business") constraints.push(`Audience: business/MBA`)
  else if (audienceSegment === "bipc") {
    constraints.push(`Audience: BiPC (Biology, Physics, Chemistry)${department && DEPARTMENT_LABELS[department] ? `, Stream: ${DEPARTMENT_LABELS[department]}` : ""}`)
  } else if (audienceSegment === "digital_forensic") constraints.push(`Audience: Digital Forensics & Cyber`)
  else if (audienceSegment === "elite_sciences") constraints.push(`Audience: Elite Medical (Physiotherapy, Anesthesia)`)
  else if (audienceSegment === "bba") constraints.push(`Audience: BBA (Bachelor of Business Administration)`)
  else if (audienceSegment === "ece") constraints.push(`Audience: ECE (Electronics & Communication Engineering)`)
  else if (audienceSegment === "aeronautical") constraints.push(`Audience: Aeronautical Engineering`)
  else if (audienceSegment === "school") {
    const cls = (schoolClass || "").trim()
    constraints.push(`Audience: school students${cls ? `, Class: ${cls}` : ""}`)
    constraints.push("Questions must be age-appropriate and curriculum-aligned for the selected class.")
  }

  const constraintText = constraints.length ? "\nConstraints: " + constraints.join(". ") : ""

  if (multiLang) {
    const langArr = languages.map((l) => `"${l}"`).join(",")
    return `TASK: Generate exactly ${count} educational MCQ questions.
LANGUAGES: ${langNames} (${languages.join(", ")})
TOPIC: ${topic || "General Knowledge"}
${constraintText}

JSON STRUCTURE:
{
  "languages": [${langArr}],
  "questionsMultiLang": [
    {
      "translations": {
        ${languages.map(l => `"${l}": { "question": "...", "options": ["...", "...", "...", "..."], "correct": 0, "explanation": "..." }`).join(",\n        ")}
      }
    }
  ]
}

CRITICAL RULES:
1. Output ONLY valid raw JSON.
2. Every item in questionsMultiLang MUST have ALL keys: ${languages.join(", ")}.
3. Do not omit any language. 
4. Options must be identical in meaning across languages.
5. All ${count} questions must be DISTINCT: different facts/scenarios/wording — no duplicate or near-duplicate questions.
6. Options mutually exclusive; exactly one clearly correct answer per language.`
  }

  return `TASK: Generate exactly ${count} MCQ questions.
TOPIC: ${topic || "General Knowledge"}
${constraintText}

JSON STRUCTURE:
{
  "questions": [
    { "question": "...", "options": ["...", "...", "...", "..."], "correct": 0, "explanation": "..." }
  ]
}

Output ONLY valid raw JSON.

CRITICAL: All ${count} questions must be DISTINCT — no repeated or paraphrased duplicates; each MCQ must test a different point.
Options must be mutually exclusive; exactly one clearly correct answer; distractors must be plausible but wrong.`
}

function extractJson(text: string): { questions?: any[]; questionsMultiLang?: any[]; languages?: string[] } | null {
  let trimmed = text.trim()
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) trimmed = codeBlockMatch[1].trim()
  trimmed = trimmed.replace(/^[\s\uFEFF]*/, "").replace(/[\s\uFEFF]*$/, "")
  if (/^[^{\[]/.test(trimmed)) {
    const objStart = trimmed.indexOf("{")
    const arrStart = trimmed.indexOf("[")
    const start = objStart >= 0 && (arrStart < 0 || objStart < arrStart) ? objStart : arrStart
    if (start >= 0) trimmed = trimmed.slice(start)
  }
  const tryParse = (jsonStr: string): any => {
    const s = jsonStr.replace(/,(\s*[}\]])/g, "$1")
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  }
  let parsed: any = null
  const objStart = trimmed.indexOf("{")
  if (objStart !== -1) {
    const end = trimmed.lastIndexOf("}") + 1
    if (end > objStart) parsed = tryParse(trimmed.slice(objStart, end))
  }
  if (!parsed?.questions?.length && !parsed?.questionsMultiLang?.length) {
    const qMatch = trimmed.match(/"questions"\s*:\s*\[/i)
    const qmLangMatch = trimmed.match(/"questionsMultiLang"\s*:\s*\[/i)
    const bracketStart = qMatch ? trimmed.indexOf("[", qMatch.index!) : -1
    const mLangStart = qmLangMatch ? trimmed.indexOf("[", qmLangMatch.index!) : -1
    if (qMatch && bracketStart >= 0) {
      const content = extractBalancedBrackets(trimmed, bracketStart, "[", "]")
      if (content) {
        const arr = tryParse("[" + content + "]")
        if (Array.isArray(arr) && arr.length) parsed = { questions: arr }
      }
    }
    if (!parsed?.questions?.length && qmLangMatch && mLangStart >= 0) {
      const content = extractBalancedBrackets(trimmed, mLangStart, "[", "]")
      if (content) {
        const arr = tryParse("[" + content + "]")
        if (Array.isArray(arr) && arr.length) parsed = { questionsMultiLang: arr }
      }
    }
  }
  if (!parsed?.questions?.length && !parsed?.questionsMultiLang?.length) {
    const arrStart = trimmed.indexOf("[")
    if (arrStart >= 0) {
      const content = extractBalancedBrackets(trimmed, arrStart, "[", "]")
      if (content) {
        const arr = tryParse("[" + content + "]")
        if (Array.isArray(arr) && arr.length) parsed = { questions: arr }
      }
    }
  }
  return parsed
}

async function tryRepairJson(raw: string): Promise<{ questions?: any[]; questionsMultiLang?: any[]; languages?: string[] } | null> {
  const snippet = raw.slice(0, 45000)
  const repair = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You fix malformed or truncated quiz JSON. Output ONLY valid JSON: either { \"questions\": [...] } or { \"languages\":[], \"questionsMultiLang\": [...] }. No markdown, no explanation."
      },
      { role: "user", content: `Fix this into valid JSON only:\n${snippet}` }
    ],
    { temperature: 0, max_tokens: 8192 }
  )
  if (!repair.ok || !repair.content) return null
  return extractJson(repair.content)
}

function extractBalancedBrackets(s: string, start: number, open: string, close: string): string | null {
  if (s[start] !== open) return null
  let depth = 1, i = start + 1, inString = false, escape = false, quote = ""
  while (i < s.length && depth > 0) {
    const c = s[i]
    if (escape) {
      escape = false
      i++
      continue
    }
    if (inString) {
      if (c === "\\") escape = true
      else if (c === quote) inString = false
      i++
      continue
    }
    if (c === '"' || c === "'") {
      inString = true
      quote = c
      i++
      continue
    }
    if (c === open) depth++
    else if (c === close) depth--
    i++
  }
  return depth === 0 ? s.slice(start + 1, i - 1) : null
}

function normalizeSingle(rows: any[]): SingleQuestion[] {
  return (rows || []).map((q: any, qIdx: number) => {
    const opts: string[] = Array.isArray(q?.options)
      ? q.options.map(String).filter(Boolean)
      : q?.options && typeof q.options === "object"
        ? Object.values(q.options).map(String).filter(Boolean)
        : []
    let correctIdx = Number(q?.correct ?? q?.correctIndex ?? 0)
    if (correctIdx >= 1 && correctIdx <= 4) correctIdx -= 1
    const correct = Math.max(0, Math.min(opts.length - 1, correctIdx))
    const correctText = opts[correct] ?? opts[0]
    const shuffled = opts.length >= 2 ? seededShuffle(opts, (qIdx + 1) * 17) : opts
    const newCorrect = Math.max(0, shuffled.findIndex((o) => o === correctText))
    const question = String(q?.question ?? q?.q ?? "").trim()
    return {
      question,
      options: shuffled.length >= 2 ? shuffled : [],
      correct: newCorrect >= 0 ? newCorrect : 0,
      explanation: typeof q?.explanation === "string" ? q.explanation.trim() : undefined
    }
  }).filter((q) => q.question && q.options.length >= 4)
}

function normalizeMultiLang(rows: any[], languages: string[]): MultiLangQuestion[] {
  return (rows || []).map((item: any, qIdx: number) => {
    const trans = item?.translations && typeof item.translations === "object" ? item.translations : {}
    const out: Record<string, { question: string; options: string[]; correct: number; explanation?: string }> = {}
    for (const lang of languages) {
      const t = trans[lang]
      if (!t || typeof t.question !== "string" || !t.question.trim()) continue
      const rawOpts = Array.isArray(t.options) ? t.options.map(String).map((x: string) => x.trim()).filter(Boolean) : []
      const opts = Array.from(new Set(rawOpts))
      if (opts.length !== 4) continue
      const correctIdx = Math.max(0, Math.min(opts.length - 1, Number(t.correct) ?? 0))
      const correctText = opts[correctIdx] ?? opts[0]
      const seed = (qIdx * 31 + lang.charCodeAt(0)) * 17
      const shuffled = seededShuffle(opts, seed)
      const newCorrect = Math.max(0, shuffled.findIndex((o) => o === correctText))
      out[lang] = {
        question: t.question.trim(),
        options: shuffled as string[],
        correct: newCorrect >= 0 ? newCorrect : 0,
        explanation: typeof t.explanation === "string" ? t.explanation.trim() : undefined
      }
    }
    return { translations: out }
    // Require at least 1 valid language translation (not all), prevents dropping everything when AI misses a language
  }).filter((m) => Object.keys(m.translations).length === languages.length)
}

function dedupeSingleQuestions(rows: SingleQuestion[], existing: Set<string>): SingleQuestion[] {
  const seen = new Set<string>()
  const out: SingleQuestion[] = []
  for (const q of rows) {
    const stem = normalizeQuestionStem(q.question)
    if (!stem) continue
    if (seen.has(stem) || existing.has(stem)) continue
    const uniqueOpts = Array.from(new Set(q.options.map((x) => x.trim()).filter(Boolean)))
    if (uniqueOpts.length !== 4) continue
    if (q.correct < 0 || q.correct >= uniqueOpts.length) continue
    seen.add(stem)
    out.push({ ...q, options: uniqueOpts })
  }
  return out
}

function dedupeMultiLangQuestions(rows: MultiLangQuestion[], languages: string[], existing: Set<string>): MultiLangQuestion[] {
  const seen = new Set<string>()
  const out: MultiLangQuestion[] = []
  for (const q of rows) {
    const enLike = q.translations[languages[0]]
    const stem = normalizeQuestionStem(enLike?.question ?? "")
    if (!stem) continue
    if (seen.has(stem) || existing.has(stem)) continue
    let ok = true
    for (const lang of languages) {
      const t = q.translations[lang]
      if (!t) { ok = false; break }
      const uniqueOpts = Array.from(new Set((t.options || []).map((x: string) => String(x).trim()).filter(Boolean)))
      if (uniqueOpts.length !== 4) { ok = false; break }
      if (t.correct < 0 || t.correct >= uniqueOpts.length) { ok = false; break }
      t.options = uniqueOpts
    }
    if (!ok) continue
    seen.add(stem)
    out.push(q)
  }
  return out
}

async function verifyAnswersWithAi(rows: SingleQuestion[]): Promise<SingleQuestion[]> {
  if (!rows.length) return rows
  const payload = rows.map((q) => ({ question: q.question, options: q.options, correct: q.correct }))
  const result = await chatCompletion(
    [
      {
        role: "system",
        content:
          "You are an MCQ validator. Verify each question and correct the `correct` index if needed. Output ONLY JSON: {\"questions\":[{\"correct\":0}]}"
      },
      { role: "user", content: `Validate factual correctness and return corrected indexes only:\n${JSON.stringify(payload)}` }
    ],
    { temperature: 0, max_tokens: 4096 }
  )
  if (!result.ok) return rows
  try {
    const text = result.content.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")
    const parsed = JSON.parse(text) as { questions?: Array<{ correct?: number }> }
    if (!Array.isArray(parsed.questions)) return rows
    return rows.map((q, i) => {
      const c = Number(parsed.questions?.[i]?.correct)
      if (!Number.isFinite(c) || c < 0 || c > 3) return q
      return { ...q, correct: c }
    })
  } catch {
    return rows
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  if (!isAiConfigured()) {
    return NextResponse.json({ ok: false, error: "NVIDIA_API_KEY not configured. Add it in .env.local. Get a key at build.nvidia.com" }, { status: 503 })
  }

  const settings = await getSettings()
  const limit = Math.max(1, Math.min(100, Number(settings?.aiQuestionLimit) || 20))

  const body = await req.json().catch(() => ({}))
  let count = Math.max(1, Math.min(limit, Number(body?.count) || 10))
  const languages: string[] = Array.isArray(body?.languages)
    ? body.languages.map((l: any) => String(l).toLowerCase()).filter((l: string) => ["en", "hi", "te", "ta", "mr", "gu", "kn", "ml", "bn", "es"].includes(l))
    : ["en"]
  if (languages.length === 0) languages.push("en")
  // Reduce count aggressively for large multilang to avoid token overflow
  if (languages.length >= 6 && count > 3) count = 3
  else if (languages.length >= 4 && count > 5) count = 5
  else if (languages.length >= 2 && count > 8) count = 8
  const topic = typeof body?.topic === "string" ? body.topic.trim() : ""
  const difficulties: string[] = Array.isArray(body?.difficulties)
    ? body.difficulties.map((d: any) => String(d).trim()).filter((d: string) => DIFFICULTIES.includes(d as any))
    : []
  const questionTypes: string[] = Array.isArray(body?.questionTypes)
    ? body.questionTypes.map((t: any) => String(t).toLowerCase().trim()).filter((t: string) => QUESTION_TYPES.includes(t as any))
    : []
  const audienceSegment =
    typeof body?.audienceSegment === "string" && ["btech", "pg", "business", "bipc", "digital_forensic", "elite_sciences", "bba", "ece", "aeronautical", "school"].includes(body.audienceSegment)
      ? body.audienceSegment
      : undefined
  const department =
    typeof body?.department === "string" && body.department.trim() && DEPARTMENT_LABELS[body.department.trim().toLowerCase()]
      ? body.department.trim().toLowerCase()
      : undefined
  const schoolClass =
    typeof body?.schoolClass === "string" && /^(?:[1-9]|1[0-2])$/.test(body.schoolClass.trim())
      ? body.schoolClass.trim()
      : undefined

  const systemMsg = "Quiz generator. Output ONLY valid JSON. No text, no markdown. Start with { end with }."

  const langMultiplier = languages.length > 1 ? Math.min(languages.length, 4) : 1

  async function runOneShot(chunkCount: number) {
    const prompt = buildPrompt(topic, chunkCount, languages, difficulties, questionTypes, audienceSegment, department, schoolClass)
    const estimatedTokens = Math.ceil((chunkCount * 280 + 600) * langMultiplier)
    const maxTokens = Math.min(16384, Math.max(2048, estimatedTokens))
    const result = await chatCompletion(
      [{ role: "system", content: systemMsg }, { role: "user", content: prompt }],
      { temperature: 0.1, max_tokens: maxTokens }
    )
    if (!result.ok) return { ok: false as const, error: result.error, status: result.status }
    let parsed = extractJson(result.content)
    if (!parsed) parsed = await tryRepairJson(result.content)
    return { ok: true as const, parsed, rawPreview: result.content.slice(0, 200) }
  }

  function chunkSizes(total: number, maxPer: number): number[] {
    const out: number[] = []
    let left = total
    while (left > 0) {
      const n = Math.min(maxPer, left)
      out.push(n)
      left -= n
    }
    return out
  }

  try {
    const existingQuizzes = await getQuizzes()
    const existingStems = new Set<string>()
    for (const qz of existingQuizzes.slice(0, 120)) {
      for (const q of qz.questions ?? []) {
        if (q?.question) existingStems.add(normalizeQuestionStem(String(q.question)))
      }
      for (const mq of qz.questionsMultiLang ?? []) {
        const t = mq?.translations?.en || Object.values(mq?.translations ?? {})[0]
        if (t && typeof t.question === "string") existingStems.add(normalizeQuestionStem(t.question))
      }
    }

    if (languages.length === 1 && count > 6) {
      const sizes = chunkSizes(count, 5)
      const merged: SingleQuestion[] = []
      for (const c of sizes) {
        const r = await runOneShot(c)
        if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status })
        const rows = r.parsed?.questions ?? []
        const norm = normalizeSingle(rows)
        if (norm.length === 0) {
          return NextResponse.json(
            {
              ok: false,
              error: `Chunk (${c} questions) produced no valid rows. Preview: "${r.rawPreview?.replace(/\n/g, " ") ?? ""}..."`
            },
            { status: 502 }
          )
        }
        merged.push(...norm)
      }
      let finalRows = dedupeSingleQuestions(merged, existingStems).slice(0, count)
      finalRows = await verifyAnswersWithAi(finalRows)
      if (finalRows.length < Math.max(3, Math.ceil(count * 0.7))) {
        return NextResponse.json({ ok: false, error: "AI output had too many duplicates/invalid answers. Try a more specific topic." }, { status: 502 })
      }
      return NextResponse.json({ ok: true, questions: finalRows, count: finalRows.length })
    }

    const r = await runOneShot(count)
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: r.status })
    const parsed = r.parsed
    if (!parsed) {
      const snippet = (r.rawPreview ?? "").replace(/\n/g, " ")
      return NextResponse.json(
        {
          ok: false,
          error: `AI did not return valid JSON after repair. Preview: "${snippet}${snippet.length > 200 ? "..." : ""}". Try fewer questions.`
        },
        { status: 502 }
      )
    }

    if (parsed.questionsMultiLang && Array.isArray(parsed.questionsMultiLang)) {
      const langs = Array.isArray(parsed.languages) && parsed.languages.length ? parsed.languages : languages
      const questionsMultiLang = dedupeMultiLangQuestions(normalizeMultiLang(parsed.questionsMultiLang, langs), langs, existingStems).slice(0, count)
      if (questionsMultiLang.length === 0) {
        return NextResponse.json({
          ok: false,
          error: "AI returned multi-lang format but no valid questions after parsing. Try English only or fewer questions."
        }, { status: 502 })
      }
      return NextResponse.json({ ok: true, questionsMultiLang, languages: langs, count: questionsMultiLang.length })
    }
    let questions = dedupeSingleQuestions(normalizeSingle(parsed.questions ?? []), existingStems).slice(0, count)
    questions = await verifyAnswersWithAi(questions)
    if (questions.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "AI returned questions but none were valid after parsing. Try a simpler topic or fewer questions."
      }, { status: 502 })
    }
    return NextResponse.json({ ok: true, questions, count: questions.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

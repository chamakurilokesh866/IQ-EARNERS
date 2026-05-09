/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Admin-only: Generate EAMCET/EAPCET mock exam questions via AI.
 * Saves directly to mock_exams table. Uses chunked generation for 100 questions.
 */
import { NextResponse } from "next/server"

export const maxDuration = 120
import { requireAdmin } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { rateLimit } from "@/lib/rateLimit"
import { chatCompletionForMockExam, isMockExamAiConfigured } from "@/lib/aiGateway"
import { createServerSupabase } from "@/lib/supabase"
import { normalizeQuestionStem } from "@/lib/quizQuestionDedupe"

function tryParse(jsonStr: string): { modules?: any[]; questions?: any[] } | null {
  const fixed = jsonStr
    .replace(/,(\s*[}\]])/g, "$1")  // trailing commas
    .replace(/\r\n/g, "\n")
  try {
    const v = JSON.parse(fixed)
    if (v && typeof v === "object") return v
  } catch {
    try {
      return JSON.parse(jsonStr)
    } catch {}
  }
  return null
}

function extractJson(text: string): { modules?: any[]; questions?: any[] } | any[] | null {
  let trimmed = text.trim()
  // Strip common AI prefixes
  trimmed = trimmed.replace(/^(?:Here(?:'s| is) (?:the |your )?)?(?:JSON|json)(?:\s*(?:output|response|below))?[:\s]*/i, "")
  trimmed = trimmed.replace(/^(?:Sure|Okay|Certainly)[,!]?\s*(?:here(?:'s| is)|below is)[\s\S]*?:\s*/i, "")
  // Extract from markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) trimmed = codeBlockMatch[1].trim()
  trimmed = trimmed.replace(/^[\s\uFEFF]*/, "").replace(/[\s\uFEFF]*$/, "")
  // Skip leading non-JSON text
  const objStart = trimmed.indexOf("{")
  const arrStart = trimmed.indexOf("[")
  const start = objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart)
  if (start >= 0) trimmed = trimmed.slice(start)
  // Try parse as-is
  let parsed = tryParse(trimmed)
  if (parsed) return parsed
  // Extract top-level object/array by bracket matching
  const first = trimmed[0]
  if (first === "{" || first === "[") {
    const stack: string[] = []
    let end = -1
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i]
      if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]")
      else if (c === "}" || c === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === c) stack.pop()
        if (stack.length === 0) {
          end = i + 1
          break
        }
      }
    }
    if (end > 0) {
      parsed = tryParse(trimmed.slice(0, end))
      if (parsed) return parsed
    }
  }
  // Try last complete object
  const lastBrace = trimmed.lastIndexOf("}")
  const lastBracket = trimmed.lastIndexOf("]")
  const last = Math.max(lastBrace, lastBracket)
  if (last > 0) {
    const sliceStart = trimmed[0] === "[" ? 0 : trimmed.indexOf("{")
    if (sliceStart >= 0) {
      parsed = tryParse(trimmed.slice(sliceStart, last + 1))
      if (parsed) return parsed
    }
  }
  // Fallback: look for "modules" or "questions" in raw text and try to extract
  const modulesMatch = trimmed.match(/"modules"\s*:\s*(\[[\s\S]*?\](?=\s*[},]|\s*$))/)
  if (modulesMatch) {
    try {
      const mods = JSON.parse(modulesMatch[1])
      if (Array.isArray(mods)) return { modules: mods }
    } catch {}
  }
  const questionsMatch = trimmed.match(/"questions"\s*:\s*(\[[\s\S]*?\](?=\s*[},]|\s*$))/)
  if (questionsMatch) {
    try {
      const qs = JSON.parse(questionsMatch[1])
      if (Array.isArray(qs)) return { questions: qs }
    } catch {}
  }
  return null
}

function extractQuestionObjectsFromText(text: string): any[] {
  const src = String(text ?? "")
  const out: any[] = []
  const re = /\{[\s\S]*?"question"\s*:\s*"[\s\S]*?"options"\s*:\s*\[[\s\S]*?\][\s\S]*?"correct"\s*:\s*-?\d+[\s\S]*?\}/g
  const matches = src.match(re) ?? []
  for (const m of matches) {
    const parsed = tryParse(m)
    if (parsed && typeof parsed === "object") out.push(parsed)
  }
  return out
}

function normalizeQuestions(rows: any[]): { question: string; options: string[]; correct: number; explanation?: string }[] {
  return (rows || []).map((q: any) => {
    const opts: string[] = Array.isArray(q?.options)
      ? q.options.map(String).filter(Boolean)
      : []
    let correctIdx = Number(q?.correct ?? q?.correctIndex ?? 0)
    if (correctIdx >= 1 && correctIdx <= 4) correctIdx -= 1
    const correct = Math.max(0, Math.min(opts.length - 1, correctIdx))
    return {
      question: String(q?.question ?? q?.q ?? "").trim(),
      options: opts.length >= 2 ? opts : [],
      correct,
      explanation: typeof q?.explanation === "string" ? q.explanation.trim() : undefined
    }
  }).filter((q) => q.question && q.options.length >= 2)
}

/** Convert parsed AI output to modules. Handles { modules }, { questions }, or root array of modules */
function toModules(
  parsed: { modules?: any[]; questions?: any[] } | any[] | null,
  moduleNames: string[]
): { name: string; questions: { question: string; options: string[]; correct: number; explanation?: string }[] }[] {
  if (!parsed) return []
  let mods: any[] | null = null
  if (Array.isArray(parsed)) {
    const first = parsed[0]
    if (first && typeof first === "object" && (Array.isArray(first.questions) || first.name)) {
      mods = parsed
    } else {
      mods = null
    }
  } else if (Array.isArray((parsed as any).modules) && (parsed as any).modules.length > 0) {
    mods = (parsed as any).modules
  }
  if (mods && mods.length > 0) {
    return mods.map((m: any) => ({
      name: String(m?.name ?? "").trim() || "Section",
      questions: normalizeQuestions(Array.isArray(m?.questions) ? m.questions : [])
    })).filter((m) => m.questions.length > 0)
  }
  // Fallback: flat questions array — distribute round-robin into modules
  const flat = Array.isArray((parsed as any)?.questions) ? (parsed as any).questions : []
  if (flat.length === 0) return []
  const qs = normalizeQuestions(flat)
  const modules = moduleNames.map((name) => ({ name, questions: [] as typeof qs }))
  qs.forEach((q, i) => {
    const idx = i % modules.length
    modules[idx].questions.push(q)
  })
  return modules.filter((m) => m.questions.length > 0)
}

const BATCH_SIZE = 25

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const rl = await rateLimit(req, "mockExamGenerate")
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many requests. Try again in ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  if (!isMockExamAiConfigured()) {
    return NextResponse.json({
      ok: false,
      error: "MOCK_EXAM_AI_API_KEY not configured. Add it in .env.local for Mock Exam AI (separate from Quiz AI)."
    }, { status: 503 })
  }

  const settings = await getSettings()
  const limit = Math.max(1, Math.min(100, Number(settings?.aiQuestionLimit) || 20))

  const body = await req.json().catch(() => ({}))
  const count = Math.max(1, Math.min(limit, Number(body?.count) || 100))
  const topic = typeof body?.topic === "string" ? body.topic.trim() : ""
  const audience = ["mpc", "bipc", "cert"].includes(body?.audience) ? body.audience : "mpc"
  const examType = ["ts", "ap", "emcert", "apcert"].includes(body?.examType) ? body.examType : "ts"
  const merge = body?.merge === true

  const courseId = audience
  const examLabels: Record<string, string> = {
    ts: "TS EAMCET",
    ap: "AP EAPCET",
    emcert: "EMCERT",
    apcert: "APCERT"
  }
  const examLabel = examLabels[examType] || "TS EAMCET"

  const moduleConfig: Record<string, string[]> = {
    mpc: ["Mathematics", "Physics", "Chemistry", "Computer Basics / ICT"],
    bipc: ["Biology", "Physics", "Chemistry", "Digital Education Tools / Computer Fundamentals"],
    cert: [
      "ICT in Education",
      "Computer Fundamentals",
      "Internet Concepts",
      "Google Classroom and Digital Teaching Tools",
      "Cyber Safety and Data Security",
      "File Management and Cloud Storage"
    ]
  }
  const moduleNames = moduleConfig[courseId] || moduleConfig.mpc

  const systemMsg = `Act as an expert exam paper setter for Indian competitive exams such as TS EAMCET, AP EAMCET, EMCERT, and APCERT.
Your task is to generate high-quality multiple choice questions that closely follow the real exam pattern, syllabus, and difficulty level.
Analyze typical syllabus, subjects, and previous year exam patterns from the last 10 years.
Generate questions that are conceptually similar to previous year questions (80–90% similarity in topic and difficulty), but do NOT copy exact questions.

CRITICAL: Your response must be ONLY raw JSON. No markdown, no \`\`\`json, no explanation, no text before or after. Start with { and end with }.`

  const streamDesc = courseId === "mpc"
    ? "MPC Group (Engineering): Mathematics, Physics, Chemistry, Computer basics/ICT"
    : courseId === "bipc"
      ? "BiPC Group (Medical): Biology, Physics, Chemistry, Digital education tools/Computer fundamentals"
      : "Digital Certification (EMCERT/APCERT): ICT in education, Computer fundamentals, Internet, Google Classroom, Cyber safety, File management"

  const topicLine = topic ? `\nAdditional topic/focus: ${topic}\n` : ""

  function buildPrompt(batchCount: number, batchIndex: number, totalBatches: number): string {
    const pMod = Math.max(5, Math.floor(batchCount / moduleNames.length))
    const batchNote = totalBatches > 1 ? `\nThis is batch ${batchIndex + 1} of ${totalBatches}. Generate exactly ${batchCount} questions for this batch.\n` : ""
    return `Generate ${batchCount} Multiple Choice Questions for ${examLabel} - ${streamDesc}.${topicLine}${batchNote}

INSTRUCTIONS:
1. Analyze typical syllabus and previous year exam patterns (last 10 years).
2. Questions must be conceptually similar to previous year questions (80–90% similarity in topic and difficulty), but do NOT copy exact questions.
3. Follow real exam format: single-correct MCQ, exactly 4 options (A, B, C, D).

DIFFICULTY DISTRIBUTION (strictly follow):
• 40% Easy
• 40% Medium
• 20% Hard

Each question MUST have:
• question: the question text
• options: array of exactly 4 strings [A, B, C, D]
• correct: index 0–3
• explanation: short explanation that TEACHES the concept behind the answer (helps students understand)

Generate exactly ${moduleNames.length} modules. Distribute questions evenly (~${pMod} per module).
MODULES: ${moduleNames.join(", ")}

Ensure questions are diverse, cover important syllabus topics, and resemble the style of previous year exam questions.
Within this batch, every question must be unique — do not repeat the same stem, fact, or trivial paraphrase.
Explanations must teach the concept—not just state the answer.

RESPONSE FORMAT: Your entire reply must be valid JSON only. Either:
{"modules":[{"name":"ModuleName","questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]}]}
OR a flat list: {"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]}
Do not wrap in markdown. Do not add any text before or after the JSON.`
  }

  function buildRepairPrompt(raw: string, batchCount: number): string {
    return `You returned malformed JSON previously. Repair and return valid JSON only.

Requirements:
- Exactly ${batchCount} questions total
- 4 options per question
- correct index must be 0-3
- Keep explanations short and useful
- Output ONLY JSON, no markdown, no extra text

Return in this format:
{"modules":[{"name":"ModuleName","questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]}]}

Malformed input to repair:
${raw}`
  }

  try {
    const batches: number[] = []
    let remaining = count
    while (remaining > 0) {
      batches.push(Math.min(BATCH_SIZE, remaining))
      remaining -= BATCH_SIZE
    }

    const allModules: { name: string; questions: { question: string; options: string[]; correct: number; explanation?: string }[] }[] = []
    const nameToIdx = new Map<string, number>()
    const globalQuestionStems = new Set<string>()

    for (let i = 0; i < batches.length; i++) {
      const batchCount = batches[i]
      const maxTokens = Math.min(16384, Math.max(8192, batchCount * 450 + 1500))
      const result = await chatCompletionForMockExam(
        [{ role: "system", content: systemMsg }, { role: "user", content: buildPrompt(batchCount, i, batches.length) }],
        { temperature: 0.3, max_tokens: maxTokens }
      )
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
      }
      const parsed = extractJson(result.content)
      let batchModules = toModules(parsed, moduleNames)
      if (batchModules.length === 0) {
        // Fallback: salvage standalone question objects from noisy output.
        const salvaged = normalizeQuestions(extractQuestionObjectsFromText(result.content))
        if (salvaged.length > 0) {
          batchModules = toModules({ questions: salvaged }, moduleNames)
        }
      }
      if (batchModules.length === 0) {
        // One automatic repair retry before failing the whole request.
        const repair = await chatCompletionForMockExam(
          [{ role: "system", content: systemMsg }, { role: "user", content: buildRepairPrompt(result.content, batchCount) }],
          { temperature: 0.1, max_tokens: maxTokens }
        )
        if (repair.ok) {
          const parsedRepair = extractJson(repair.content)
          batchModules = toModules(parsedRepair, moduleNames)
          if (batchModules.length === 0) {
            const salvagedRepair = normalizeQuestions(extractQuestionObjectsFromText(repair.content))
            if (salvagedRepair.length > 0) {
              batchModules = toModules({ questions: salvagedRepair }, moduleNames)
            }
          }
        }
      }
      if (batchModules.length === 0) {
        return NextResponse.json({
          ok: false,
          error: `AI did not return valid structure in batch ${i + 1}/${batches.length}. Try again.`
        }, { status: 502 })
      }
      for (const m of batchModules) {
        const key = m.name.toLowerCase().trim()
        let idx = nameToIdx.get(key)
        if (idx === undefined) {
          idx = allModules.length
          nameToIdx.set(key, idx)
          allModules.push({ name: m.name, questions: [] })
        }
        for (const q of m.questions) {
          const stem = normalizeQuestionStem(q.question)
          if (!stem || globalQuestionStems.has(stem)) continue
          globalQuestionStems.add(stem)
          allModules[idx].questions.push(q)
        }
      }
    }

    const modules = allModules.filter((m) => m.questions.length > 0)
    const totalAdded = modules.reduce((s, m) => s + m.questions.length, 0)
    if (totalAdded === 0) {
      return NextResponse.json({
        ok: false,
        error: "No valid questions parsed. Try a different topic or count."
      }, { status: 502 })
    }

    const supabase = createServerSupabase()
    if (!supabase) return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 })

    let finalModules = modules
    if (merge) {
      const { data: existing } = await supabase.from("mock_exams").select("questions").eq("id", courseId).single()
      const prevData = existing?.questions as { modules?: { name: string; questions: any[] }[] } | null
      const prevModules = Array.isArray(prevData?.modules) ? prevData.modules : []
      const seen = new Set<string>()
      for (const m of prevModules) {
        for (const q of m.questions || []) {
          seen.add((q?.question || "").trim().slice(0, 150))
        }
      }
      const merged = prevModules.map((pm) => ({ ...pm }))
      const nameToIdx = new Map(merged.map((m, i) => [m.name.toLowerCase(), i]))
      for (const m of modules) {
        const idx = nameToIdx.get(m.name.toLowerCase())
        if (idx !== undefined && merged[idx]) {
          for (const q of m.questions) {
            const key = (q.question || "").trim().slice(0, 150)
            if (key && !seen.has(key)) {
              seen.add(key)
              merged[idx].questions = merged[idx].questions || []
              merged[idx].questions!.push(q)
            }
          }
        } else {
          merged.push({ name: m.name, questions: m.questions })
        }
      }
      finalModules = merged.filter((m) => (m.questions?.length ?? 0) > 0).map((m) => ({
        name: m.name,
        questions: m.questions || []
      }))
    }

    const totalCount = finalModules.reduce((s, m) => s + m.questions.length, 0)
    const { error } = await supabase.from("mock_exams").upsert({
      id: courseId,
      questions: { modules: finalModules },
      created_at: Math.floor(Date.now())
    }, { onConflict: "id" })

    if (error) {
      return NextResponse.json({ ok: false, error: `Database error: ${error.message}` }, { status: 500 })
    }
    return NextResponse.json({ ok: true, count: totalCount, added: totalAdded, courseId, modules: finalModules.map((m) => ({ name: m.name, count: m.questions.length })) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Generation failed" }, { status: 500 })
  }
}

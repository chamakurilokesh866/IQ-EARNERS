/**
 * Parse quiz questions from extracted PDF text.
 * Single-language: "1. Q? A) x B) y C) z D) w Answer: A"
 * Multi-language: [LANG:en] ... [LANG:hi] ... (questions grouped by language)
 */

export type ParsedQuestion = {
  question: string
  options: string[]
  correct: number
  category?: string
  difficulty?: string
  explanation?: string
}

export type MultiLangQuestion = {
  translations: Record<string, { question: string; options: string[]; correct: number; explanation?: string }>
}

function parseLetter(s: string): number {
  const u = String(s).toUpperCase().trim()
  if (u === "A") return 0
  if (u === "B") return 1
  if (u === "C") return 2
  if (u === "D") return 3
  return 0
}

function parseQuestionsInBlock(lines: string[], startIdx: number): { questions: ParsedQuestion[]; endIdx: number } {
  const questions: ParsedQuestion[] = []
  let i = startIdx
  while (i < lines.length) {
    const line = lines[i]
    if (/^\[LANG:/i.test(line)) break
    const numMatch = line.match(/^(?:Q?\s*)?(\d+)[.)]\s*(.+)/i)
    if (!numMatch) {
      i++
      continue
    }
    let questionText = numMatch[2].trim()
    const options: string[] = []
    let correct = 0
    let explanation = ""
    i++
    while (i < lines.length) {
      const optLine = lines[i]
      if (/^\[LANG:/i.test(optLine)) break
      const optMatch = optLine.match(/^[(\[]?\s*([A-Da-d])\s*[.)\]:]\s*(.+)/i)
      if (optMatch) {
        options.push(optMatch[2].trim())
        i++
        continue
      }
      const ansMatch = optLine.match(/^(?:Answer|Correct|Key)\s*[:\-]\s*[(\[]?\s*([A-Da-d0-3])\s*[)\]]?/i)
      if (ansMatch) {
        const v = ansMatch[1]
        if (/^[0-3]$/.test(v)) correct = Number(v)
        else correct = parseLetter(v)
        i++
        const explMatch = lines[i]?.match(/^(?:Explanation|Explain)\s*[:\-]\s*(.+)/i)
        if (explMatch) {
          explanation = explMatch[1].trim()
          i++
        }
        break
      }
      if (/^\d+[.)]\s/.test(optLine) || /^Q?\s*\d+[.)]\s/i.test(optLine)) break
      i++
    }
    if (questionText && options.length >= 2) {
      questions.push({
        question: questionText,
        options,
        correct: Math.min(correct, options.length - 1),
        category: "General",
        difficulty: "Medium",
        ...(explanation ? { explanation } : {})
      })
    }
  }
  return { questions, endIdx: i }
}

export function parseMultiLangQuizFromText(text: string): { questions: MultiLangQuestion[]; languages: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const langBlocks: Record<string, ParsedQuestion[]> = {}
  let i = 0
  while (i < lines.length) {
    const langMatch = lines[i].match(/^\[LANG:\s*(\w{2,10})\s*\]/i)
    if (langMatch) {
      const lang = langMatch[1].toLowerCase()
      i++
      const { questions, endIdx } = parseQuestionsInBlock(lines, i)
      if (questions.length > 0) langBlocks[lang] = questions
      i = endIdx
    } else {
      i++
    }
  }
  const languages = Object.keys(langBlocks)
  if (languages.length === 0) return { questions: [], languages: [] }
  const firstLang = languages[0]
  const firstQuestions = langBlocks[firstLang] ?? []
  const questions: MultiLangQuestion[] = firstQuestions.map((q, idx) => {
    const translations: MultiLangQuestion["translations"] = {}
    for (const lang of languages) {
      const qq = langBlocks[lang]?.[idx]
      if (qq) {
        translations[lang] = {
          question: qq.question,
          options: qq.options,
          correct: qq.correct,
          explanation: qq.explanation
        }
      }
    }
    if (Object.keys(translations).length === 0) {
      translations[firstLang] = {
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation
      }
    }
    return { translations }
  })
  return { questions, languages }
}

export function parseQuizFromText(text: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const numMatch = line.match(/^(?:Q?\s*)?(\d+)[.)]\s*(.+)/i)
    if (!numMatch) {
      i++
      continue
    }
    let questionText = numMatch[2].trim()
    const options: string[] = []
    let correct = 0
    let explanation = ""

    i++
    while (i < lines.length) {
      const optLine = lines[i]
      const optMatch = optLine.match(/^[(\[]?\s*([A-Da-d])\s*[.)\]:]\s*(.+)/i)
      if (optMatch) {
        options.push(optMatch[2].trim())
        i++
        continue
      }
      const ansMatch = optLine.match(/^(?:Answer|Correct|Key)\s*[:\-]\s*[(\[]?\s*([A-Da-d0-3])\s*[)\]]?/i)
      if (ansMatch) {
        const v = ansMatch[1]
        if (/^[0-3]$/.test(v)) correct = Number(v)
        else correct = parseLetter(v)
        i++
        const explMatch = lines[i]?.match(/^(?:Explanation|Explain)\s*[:\-]\s*(.+)/i)
        if (explMatch) {
          explanation = explMatch[1].trim()
          i++
        }
        break
      }
      if (/^\d+[.)]\s/.test(optLine) || /^Q?\s*\d+[.)]\s/i.test(optLine)) break
      i++
    }

    if (questionText && options.length >= 2) {
      questions.push({
        question: questionText,
        options,
        correct: Math.min(correct, options.length - 1),
        category: "General",
        difficulty: "Medium",
        ...(explanation ? { explanation } : {})
      })
    }
  }

  return questions
}

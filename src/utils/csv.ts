export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (!lines.length) return []
  const headers = splitLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i])
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => (obj[h] = cols[idx] ?? ""))
    rows.push(obj)
  }
  return rows
}

/** Get first non-empty value from row for given keys (case-insensitive). */
export function pickFirst<T = string>(row: Record<string, unknown>, ...keys: string[]): T {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]))
  for (const k of keys) {
    const v = lower[k.toLowerCase().trim()] ?? row[k]
    if (v !== undefined && v !== null && String(v).trim() !== "") return v as T
  }
  return "" as T
}

/** Map a CSV row to quiz question format using flexible column names. */
export function rowToQuestion(row: Record<string, unknown>): {
  question: string
  options: string[]
  correct: number
  category: string
  difficulty: string
} {
  const q = pickFirst<string>(row, "question", "Question", "q", "Question Text", "question_text")
  const optKeys = [
    ["opt1", "opta", "option1", "option a", "a", "option_a"],
    ["opt2", "optb", "option2", "option b", "b", "option_b"],
    ["opt3", "optc", "option3", "option c", "c", "option_c"],
    ["opt4", "optd", "option4", "option d", "d", "option_d"]
  ]
  const options = optKeys
    .map((keys) => pickFirst<string>(row, ...keys))
    .filter((v) => v && String(v).trim())
  const correctStr = pickFirst<string>(row, "correct", "answer", "Answer", "Correct", "key", "correct_answer", "correct answer")
  let correct = Number(correctStr) || 0
  if (Number.isNaN(correct) && typeof correctStr === "string") {
    const u = correctStr.toUpperCase().trim()
    if (u === "A") correct = 0
    else if (u === "B") correct = 1
    else if (u === "C") correct = 2
    else if (u === "D") correct = 3
  }
  const category = String(pickFirst<string>(row, "category", "Category") || "General")
  const difficulty = String(pickFirst<string>(row, "difficulty", "Difficulty") || "Medium")
  return { question: String(q).trim(), options, correct, category, difficulty }
}

function splitLine(line: string): string[] {
  const result: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      result.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result.map((s) => s.trim())
}

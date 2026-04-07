/**
 * Parse quiz questions from Excel (xlsx/xls) spreadsheets.
 * Expects columns: question, option1/opt1/a, option2/opt2/b, option3, option4, correct/answer
 */
import { rowToQuestion } from "@/utils/csv"

export type ParsedQuestion = {
  question: string
  options: string[]
  correct: number
  category?: string
  difficulty?: string
  explanation?: string
}

export function parseExcelToQuestions(buffer: Buffer): ParsedQuestion[] {
  let XLSX: { read: (data: Buffer, opts: { type: string }) => any; utils: { sheet_to_json: (sheet: any, opts?: any) => any[] } }
  try {
    XLSX = require("xlsx")
  } catch {
    throw new Error("xlsx package not installed. Run: npm install xlsx")
  }
  const wb = XLSX.read(buffer, { type: "buffer" })
  const firstSheet = wb.Sheets?.[wb.SheetNames?.[0]]
  if (!firstSheet) return []
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: false }) as Record<string, unknown>[]
  return rows
    .map((r) => rowToQuestion(r as Record<string, unknown>))
    .filter((q) => q.question && q.options.length >= 2) as ParsedQuestion[]
}

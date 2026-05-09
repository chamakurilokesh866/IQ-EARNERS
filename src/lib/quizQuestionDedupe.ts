/**
 * Shared helpers so AI-generated MCQs do not repeat the same question stem
 * (admin quiz AI, org quiz AI, mock exam AI).
 */

/** Normalize question text for duplicate detection (Unicode letters/numbers, NFKC). */
export function normalizeQuestionStem(s: string): string {
  if (!s || typeof s !== "string") return ""
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Drop items whose question stem was already seen in this batch or in `existingStems`. */
export function dedupeByQuestionStem<T extends { question: string }>(rows: T[], existingStems: Set<string>): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const row of rows) {
    const stem = normalizeQuestionStem(row.question)
    if (!stem) continue
    if (seen.has(stem) || existingStems.has(stem)) continue
    seen.add(stem)
    out.push(row)
  }
  return out
}

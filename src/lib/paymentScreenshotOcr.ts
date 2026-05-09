type OcrExtract = {
  rawText: string
  utrCandidates: string[]
}

function normalizeAlphaNum(value: string): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

function dedupeKeepOrder(arr: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of arr) {
    if (!v || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

function extractUtrCandidatesFromText(text: string): string[] {
  const source = String(text ?? "")
  const rawMatches = source.match(/[A-Z0-9]{10,32}/gi) ?? []
  // Keep candidates likely to be transaction references (must contain at least 6 digits).
  const filtered = rawMatches
    .map((m) => normalizeAlphaNum(m))
    .filter((m) => (m.match(/\d/g)?.length ?? 0) >= 6)
  return dedupeKeepOrder(filtered).slice(0, 30)
}

function extractKeywordLinkedUtr(text: string): string[] {
  const source = String(text ?? "")
  const patterns = [
    /(?:UTR|UPI\s*REF(?:ERENCE)?|REFERENCE(?:\s*NO)?|RRN|TRANSACTION\s*ID|TXN\s*ID)[^A-Z0-9]{0,20}([A-Z0-9]{10,32})/gi,
    /([A-Z0-9]{10,32})[^A-Z0-9]{0,20}(?:UTR|UPI\s*REF(?:ERENCE)?|REFERENCE(?:\s*NO)?|RRN|TRANSACTION\s*ID|TXN\s*ID)/gi
  ]
  const out: string[] = []
  for (const pattern of patterns) {
    let match: RegExpExecArray | null = null
    while ((match = pattern.exec(source))) {
      const value = normalizeAlphaNum(match[1] ?? "")
      if (value) out.push(value)
    }
  }
  return dedupeKeepOrder(out)
}

export async function extractPaymentProofWithOcr(buf: Buffer): Promise<OcrExtract> {
  const Tesseract = (await import("tesseract.js")).default
  const result = await Tesseract.recognize(buf, "eng")
  const rawText = String(result?.data?.text ?? "")
  return {
    rawText,
    utrCandidates: extractUtrCandidatesFromText(rawText)
  }
}

export function pickLikelyUtrFromOcr(ocr: OcrExtract): string | null {
  const priorityFromKeywords = extractKeywordLinkedUtr(ocr.rawText)
  const all = dedupeKeepOrder([...priorityFromKeywords, ...ocr.utrCandidates])
  if (!all.length) return null
  return all[0] ?? null
}

function toEpochFromIstParts(day: number, month: number, year: number, hour: number, minute: number, ampm: string): number | null {
  if (year < 100) year += 2000
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  const a = String(ampm || "").toUpperCase()
  if (a === "PM" && hour < 12) hour += 12
  if (a === "AM" && hour === 12) hour = 0
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  // Convert "clock shown in India payment apps" (IST) to epoch.
  return utcMs - (5 * 60 + 30) * 60 * 1000
}

export function extractReceiptEpochCandidates(rawText: string): number[] {
  const source = String(rawText ?? "")
  const out: number[] = []
  const dateThenTime = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[^0-9A-Z]{0,20}(\d{1,2}):(\d{2})(?:\s*([AP]M))?/gi
  const timeThenDate = /(\d{1,2}):(\d{2})(?:\s*([AP]M))?[^0-9A-Z]{0,20}(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/gi

  let m: RegExpExecArray | null = null
  while ((m = dateThenTime.exec(source))) {
    const day = Number(m[1]); const month = Number(m[2]); const year = Number(m[3]); const hour = Number(m[4]); const minute = Number(m[5]); const ampm = String(m[6] ?? "")
    const ts = toEpochFromIstParts(day, month, year, hour, minute, ampm)
    if (ts) out.push(ts)
  }
  while ((m = timeThenDate.exec(source))) {
    const hour = Number(m[1]); const minute = Number(m[2]); const ampm = String(m[3] ?? "")
    const day = Number(m[4]); const month = Number(m[5]); const year = Number(m[6])
    const ts = toEpochFromIstParts(day, month, year, hour, minute, ampm)
    if (ts) out.push(ts)
  }
  return dedupeKeepOrder(out.map((v) => String(v))).map((v) => Number(v)).filter((v) => Number.isFinite(v))
}

export function isEnteredUtrPresentInOcr(enteredUtr: string, ocr: OcrExtract): boolean {
  const expected = normalizeAlphaNum(enteredUtr)
  if (!expected || expected.length < 10) return false
  const wholeText = normalizeAlphaNum(ocr.rawText)
  if (wholeText.includes(expected)) return true
  for (const c of ocr.utrCandidates) {
    if (c === expected) return true
    if (c.includes(expected) || expected.includes(c)) return true
  }
  return false
}

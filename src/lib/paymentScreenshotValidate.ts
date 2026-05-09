/**
 * Fast server-side checks that an uploaded buffer looks like a real photo/screenshot (not PDF renamed, empty, etc.).
 */
export function validatePaymentScreenshotBuffer(buf: Buffer): { ok: true } | { ok: false; error: string } {
  if (!buf || buf.length < 2048) {
    return { ok: false, error: "Image too small or empty. Upload a clear payment screenshot." }
  }
  if (buf.length > 5 * 1024 * 1024) {
    return { ok: false, error: "Screenshot must be under 5 MB" }
  }

  const b0 = buf[0]
  const b1 = buf[1]
  const b2 = buf[2]
  const b3 = buf[3]

  let isJpeg = b0 === 0xff && b1 === 0xd8 && b2 === 0xff
  let isPng = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47
  let isWebp = buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP"

  if (!isJpeg && !isPng && !isWebp) {
    return { ok: false, error: "Only JPEG, PNG, or WebP payment screenshots are allowed" }
  }

  // Reject tiny placeholder / solid-color files: low byte diversity in a sample
  const sampleLen = Math.min(buf.length, 8000)
  const counts = new Map<number, number>()
  for (let i = 0; i < sampleLen; i++) {
    const v = buf[i]!
    counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  const uniqueBytes = counts.size
  if (uniqueBytes < 12) {
    return { ok: false, error: "This file does not look like a valid payment screenshot" }
  }

  const maxCount = Math.max(...counts.values())
  if (maxCount / sampleLen > 0.92) {
    return { ok: false, error: "This image looks invalid or blank. Upload your actual payment receipt screenshot." }
  }

  return { ok: true }
}

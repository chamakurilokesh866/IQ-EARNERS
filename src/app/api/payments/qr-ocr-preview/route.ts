import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"
import { validatePaymentScreenshotBuffer } from "@/lib/paymentScreenshotValidate"
import { extractPaymentProofWithOcr, pickLikelyUtrFromOcr } from "@/lib/paymentScreenshotOcr"

function normalizeUtr(s: string): string {
  return String(s ?? "").trim().replace(/\s+/g, "").toUpperCase()
}

export async function POST(req: Request) {
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })

  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 })

  const screenshot = formData.get("screenshot") as File | null
  if (!screenshot || screenshot.size === 0) {
    return NextResponse.json({ ok: false, error: "Screenshot is required" }, { status: 400 })
  }
  if (screenshot.size > 5 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Screenshot must be under 5 MB" }, { status: 400 })
  }

  const buf = Buffer.from(await screenshot.arrayBuffer())
  const validated = validatePaymentScreenshotBuffer(buf)
  if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 })

  try {
    const ocr = await extractPaymentProofWithOcr(buf)
    const detected = normalizeUtr(pickLikelyUtrFromOcr(ocr) ?? "")
    return NextResponse.json({
      ok: true,
      utr: detected || null,
      candidates: ocr.utrCandidates ?? []
    })
  } catch {
    return NextResponse.json({ ok: false, error: "Could not read screenshot text" }, { status: 400 })
  }
}

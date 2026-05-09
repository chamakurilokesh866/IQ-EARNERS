import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"
import { createManualQrYesToken, verifyManualQrStartToken } from "@/lib/manualQrFlowToken"

export async function POST(req: Request) {
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const startToken = String(body?.startToken ?? "").trim()
  if (!startToken) return NextResponse.json({ ok: false, error: "Missing manual session" }, { status: 400 })

  const start = verifyManualQrStartToken(startToken)
  if (!start) {
    return NextResponse.json({ ok: false, error: "Manual session expired. Please scan again." }, { status: 400 })
  }
  const yes = createManualQrYesToken(start, Date.now())
  return NextResponse.json({ ok: true, yesToken: yes.token, yesAt: yes.yesAt, expiresAt: yes.expiresAt })
}

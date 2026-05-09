import { NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"
import { createManualQrStartToken } from "@/lib/manualQrFlowToken"

export async function POST(req: Request) {
  const rl = await rateLimit(req, "payment")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })

  const session = createManualQrStartToken(5 * 60 * 1000)
  return NextResponse.json({ ok: true, ...session })
}

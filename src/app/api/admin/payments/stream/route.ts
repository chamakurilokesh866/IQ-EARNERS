import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { getPayments } from "@/lib/payments"

export const dynamic = "force-dynamic"

const POLL_MS = 1000

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  })

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  const writeEvent = async () => {
    try {
      const arr = await getPayments()
      const pending = arr.filter((p: { status?: string }) => p.status === "pending_approval")
      const payload = `data: ${JSON.stringify({ data: pending })}\n\n`
      await writer.write(new TextEncoder().encode(payload))
    } catch {
      try {
        await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ data: [] })}\n\n`))
      } catch {}
    }
  }

  const timer = setInterval(writeEvent, POLL_MS)
  await writeEvent()

  req.signal?.addEventListener?.("abort", () => {
    clearInterval(timer)
    try {
      writer.close()
    } catch {}
  })

  return new NextResponse(readable, { headers })
}

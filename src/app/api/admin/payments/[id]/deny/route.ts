import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPayments, updatePayment } from "@/lib/payments"
import { promises as fs } from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "src", "data", "payments.json")

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })

  const body = await _req.json().catch(() => ({}))
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : ""

  const arr = await getPayments()
  const rec = arr.find((p: { id: string }) => p.id === id)
  if (!rec) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  if (rec.status !== "pending_approval") {
    return NextResponse.json({ ok: false, error: "Not pending" }, { status: 400 })
  }

  const meta = (rec.meta || {}) as Record<string, unknown>
  const ok = await updatePayment(id, {
    status: "denied",
    meta: { ...meta, denied_at: Date.now(), deny_reason: reason || undefined }
  })
  if (!ok) {
    try {
      const txt = await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]")
      const a: any[] = JSON.parse(txt || "[]")
      const idx = a.findIndex((p: any) => p.id === id)
      if (idx >= 0) {
        a[idx].status = "denied"
        a[idx].denied_at = Date.now()
        await fs.writeFile(DATA_PATH, JSON.stringify(a, null, 2), "utf-8")
      }
    } catch {}
  }

  return NextResponse.json({ ok: true })
}

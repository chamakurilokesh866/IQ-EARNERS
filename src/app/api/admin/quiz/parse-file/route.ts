import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { importQuestionsFromBuffer } from "@/lib/importQuizFromBuffer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/** POST multipart: field "file" — returns { ok, questions } for merging into an existing quiz via PUT. */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ ok: false, error: "Expected multipart form" }, { status: 400 })
  const file = form.get("file")
  if (!file || !(file instanceof File)) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 })

  const buf = Buffer.from(await file.arrayBuffer())
  const parsed = await importQuestionsFromBuffer(buf, file.name || "upload.bin")
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
  return NextResponse.json({ ok: true, questions: parsed.questions, count: parsed.questions.length })
}

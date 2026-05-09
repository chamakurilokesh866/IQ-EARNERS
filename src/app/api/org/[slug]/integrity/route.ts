import { NextResponse } from "next/server"
import { requireOrgSession } from "@/lib/orgAuth"
import { addOrgNotification, findOrgBySlug, listOrgIntegrityEvents, logOrgAuditEvent, logOrgIntegrityEvent } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  if (!["owner", "admin", "teacher"].includes(auth.session.role)) {
    return NextResponse.json({ ok: false, error: "Only owner/admin/teacher can view integrity alerts" }, { status: 403 })
  }
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const data = await listOrgIntegrityEvents(org.id)
  return NextResponse.json({ ok: true, data })
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgSession(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const typeRaw = String(body?.type ?? "other")
  const type = (["tab_hidden", "window_blur", "fullscreen_exit"].includes(typeRaw) ? typeRaw : "other") as "tab_hidden" | "window_blur" | "fullscreen_exit" | "other"
  const message = String(body?.message ?? "Focus/integrity event").trim().slice(0, 200)
  const quizId = typeof body?.quizId === "string" ? body.quizId.trim() : undefined
  const meta = body?.meta && typeof body.meta === "object" ? body.meta as Record<string, unknown> : undefined

  const event = await logOrgIntegrityEvent({
    orgId: org.id,
    quizId,
    memberId: auth.session.memberId,
    memberName: auth.session.memberName,
    username: auth.session.memberName,
    type,
    message,
    meta
  })

  if (!event) return NextResponse.json({ ok: false, error: "Failed to save integrity event" }, { status: 500 })
  await addOrgNotification({
    orgId: org.id,
    type: "integrity",
    title: "Integrity alert",
    message: `${auth.session.memberName} (${auth.session.role}) triggered ${type}`
  })
  await logOrgAuditEvent({
    orgId: org.id,
    actorMemberId: auth.session.memberId,
    actorName: auth.session.memberName,
    action: "integrity_event",
    targetType: "integrity",
    targetId: event.id,
    detail: `${type}: ${message}`
  })
  return NextResponse.json({ ok: true, data: event })
}


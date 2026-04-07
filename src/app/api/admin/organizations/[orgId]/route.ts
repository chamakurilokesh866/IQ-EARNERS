import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getEnterpriseState, patchEnterpriseState, listOrgMembers } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ orgId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { orgId } = await ctx.params
  const s = await getEnterpriseState()
  const org = s.organizations.find((o) => o.id === orgId)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  const members = await listOrgMembers(orgId)
  const quizzes = s.orgQuizzes[orgId] ?? []
  const attempts = s.orgAttempts[orgId] ?? []
  const sub = s.subscriptions.find((sub) => sub.orgId === orgId && sub.status === "active")
  return NextResponse.json({
    ok: true,
    data: {
      ...org,
      members: members.map(({ passwordHash: _, ...m }) => m),
      quizCount: quizzes.length,
      attemptCount: attempts.length,
      subscription: sub ?? null,
    }
  })
}

export async function PATCH(req: Request, ctx: { params: Promise<{ orgId: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { orgId } = await ctx.params
  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? "")

  const next = await patchEnterpriseState((s) => ({
    ...s,
    organizations: s.organizations.map((o) => {
      if (o.id !== orgId) return o
      if (action === "suspend") return { ...o, suspended: true, active: false }
      if (action === "activate") return { ...o, suspended: false, active: true }
      if (action === "approve") return { ...o, approved: true }
      if (action === "update_plan" && body.plan) return { ...o, plan: body.plan }
      return o
    })
  }))
  if (!next) return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 })
  const updated = next.organizations.find((o) => o.id === orgId)
  return NextResponse.json({ ok: true, data: updated })
}

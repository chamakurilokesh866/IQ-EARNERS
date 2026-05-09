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

  const parseCap = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }

  const next = await patchEnterpriseState((s) => ({
    ...s,
    organizations: s.organizations.map((o) => {
      if (o.id !== orgId) return o
      if (action === "suspend") return { ...o, suspended: true, active: false }
      if (action === "activate") return { ...o, suspended: false, active: true }
      if (action === "approve") return { ...o, approved: true }
      if (action === "update_plan" && body.plan) return { ...o, plan: body.plan }
      if (action === "update_limits") {
        return {
          ...o,
          maxUsersOverride: "maxUsersOverride" in body ? parseCap(body.maxUsersOverride) : o.maxUsersOverride,
          maxQuizzesOverride: "maxQuizzesOverride" in body ? parseCap(body.maxQuizzesOverride) : o.maxQuizzesOverride
        }
      }
      if (action === "update_billing") {
        const next: typeof o = { ...o }
        const strFields = [
          "legalName",
          "gstin",
          "billingAddressLine",
          "billingCity",
          "billingState",
          "billingPostalCode",
          "billingNotes",
        ] as const
        for (const k of strFields) {
          if (!(k in body)) continue
          const s = String((body as Record<string, unknown>)[k] ?? "").trim()
          if (s) (next as Record<string, unknown>)[k] = s.slice(0, 500)
          else delete (next as Record<string, unknown>)[k]
        }
        if ("annualContractValueInr" in body) {
          const v = (body as Record<string, unknown>).annualContractValueInr
          if (v === null || v === "") delete (next as Record<string, unknown>).annualContractValueInr
          else {
            const n = Number(v)
            if (Number.isFinite(n)) (next as Record<string, unknown>).annualContractValueInr = Math.max(0, Math.round(n))
          }
        }
        return next
      }
      return o
    })
  }))
  if (!next) return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 })
  const updated = next.organizations.find((o) => o.id === orgId)
  return NextResponse.json({ ok: true, data: updated })
}

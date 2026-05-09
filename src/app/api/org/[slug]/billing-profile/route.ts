import { NextResponse } from "next/server"
import { requireOrgOwnerOrAdmin } from "@/lib/orgAuth"
import { findOrgBySlug } from "@/lib/enterpriseStore"

/** B2B billing fields on file (GST / address) — visible to org owner & admin only. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = await requireOrgOwnerOrAdmin(slug)
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const org = await findOrgBySlug(slug)
  if (!org) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({
    ok: true,
    data: {
      legalName: org.legalName ?? "",
      gstin: org.gstin ?? "",
      billingAddressLine: org.billingAddressLine ?? "",
      billingCity: org.billingCity ?? "",
      billingState: org.billingState ?? "",
      billingPostalCode: org.billingPostalCode ?? "",
      annualContractValueInr: org.annualContractValueInr ?? null,
      billingNotes: org.billingNotes ?? "",
    },
  })
}

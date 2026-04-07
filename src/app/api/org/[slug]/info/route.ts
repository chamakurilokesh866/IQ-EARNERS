import { NextResponse } from "next/server"
import { findOrgBySlug } from "@/lib/enterpriseStore"

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const org = await findOrgBySlug(slug)
  if (!org || !org.active) return NextResponse.json({ ok: false, error: "Organization not found" }, { status: 404 })
  return NextResponse.json({
    ok: true,
    data: {
      name: org.name,
      slug: org.slug,
      type: org.type,
      logo: org.logo,
      tagline: org.tagline,
      primaryColor: org.primaryColor || "#7c3aed",
      accentColor: org.accentColor || "#f5b301",
      suspended: org.suspended,
    }
  })
}

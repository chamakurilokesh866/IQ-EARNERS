import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createOrganization, getEnterpriseState } from "@/lib/enterpriseStore"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const s = await getEnterpriseState()
  return NextResponse.json({ ok: true, data: s.organizations })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  if (!body.ownerName || !body.ownerEmail || !body.ownerPassword) {
    return NextResponse.json({ ok: false, error: "Owner name, email, and password (6+ chars) are required" }, { status: 400 })
  }
  const org = await createOrganization(body)
  if (!org) return NextResponse.json({ ok: false, error: "Invalid data or duplicate slug" }, { status: 400 })
  return NextResponse.json({ ok: true, data: org })
}

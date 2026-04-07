import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const envPass = process.env.ADMIN_PASSWORD ?? ""
  return NextResponse.json({ ok: true, present: !!envPass })
}

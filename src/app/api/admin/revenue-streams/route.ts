import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPayments } from "@/lib/payments"

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const payments = await getPayments()
  const success = payments.filter(p => p.status === "success")
  
  const today = Date.now()
  const thirtyDaysAgo = today - (30 * 24 * 60 * 60 * 1000)
  
  const ads30d = 0 // Placeholder
  const fees30d = success
    .filter(p => p.created_at >= thirtyDaysAgo)
    .reduce((acc, p) => acc + (p.amount || 0), 0)

  return NextResponse.json({ 
    ok: true, 
    data: { ads30d, fees30d } 
  })
}

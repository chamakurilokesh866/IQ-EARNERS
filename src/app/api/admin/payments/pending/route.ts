import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPayments } from "@/lib/payments"

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const arr = await getPayments()
  const pending = arr.filter(
    (p: { status?: string; gateway?: string }) =>
      p.status === "pending_approval" || (p.gateway === "cashfree" && p.status === "pending")
  )
  return NextResponse.json({ ok: true, data: pending })
}

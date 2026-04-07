import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPayments } from "@/lib/payments"

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const all = await getPayments()
  const withdrawals = all
    .filter((p) => p.type === "withdraw" && p.status === "pending")
    .map((p) => ({
      id: p.id,
      amount: p.amount,
      username: (p.meta as Record<string, unknown>)?.username ?? "Unknown",
      upiId: (p.meta as Record<string, unknown>)?.upiId ?? "",
      uid: (p.meta as Record<string, unknown>)?.uid ?? "",
      created_at: p.created_at
    }))
  return NextResponse.json({ ok: true, data: withdrawals })
}

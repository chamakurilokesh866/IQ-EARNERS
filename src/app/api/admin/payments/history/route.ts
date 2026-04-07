import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPayments } from "@/lib/payments"
import { getProfileByUid } from "@/lib/profiles"

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

export async function GET() {
  const admin = await isAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const arr = await getPayments()
  const withUsername = await Promise.all(arr.map(async (p: any) => {
    let username = (p?.meta as any)?.customerName ?? (p?.meta as any)?.name ?? (p?.meta as any)?.username
    if (p.profileId && !username) {
      const prof = await getProfileByUid(p.profileId)
      username = prof?.username ?? `uid:${String(p.profileId).slice(0, 8)}`
    }
    return { ...p, resolvedUsername: username }
  }))
  const sorted = [...withUsername].sort((a, b) => Number(b.created_at ?? 0) - Number(a.created_at ?? 0))
  return NextResponse.json({ ok: true, data: sorted.slice(0, 100) })
}

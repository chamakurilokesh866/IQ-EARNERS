import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const store = await cookies()
  const role = store.get("role")?.value ?? "user"
  return NextResponse.json({ ok: true, role })
}

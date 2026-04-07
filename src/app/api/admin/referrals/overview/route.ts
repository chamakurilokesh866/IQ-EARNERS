import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { cookies } from "next/headers"
import { REFERRAL_CREDIT_INR } from "@/lib/referralWalletConstants"

const DATA_PATH = path.join(process.cwd(), "src", "data", "referrals.json")

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const txt = await fs.readFile(DATA_PATH, "utf-8").catch(() => "[]")
  const referrals = JSON.parse(txt || "[]")
  const total = referrals.length
  const paid = referrals
    .filter((r: any) => r.status === "credited")
    .reduce((sum: number, r: any) => sum + Number(r.amount ?? REFERRAL_CREDIT_INR), 0)

  return NextResponse.json({ 
    ok: true, 
    data: { total, paid } 
  })
}

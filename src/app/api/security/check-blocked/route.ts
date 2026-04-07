import { NextResponse } from "next/server"
import { isIpBlocked, getClientIp } from "@/lib/inspectSecurity"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const ip = getClientIp(req)
  const blocked = await isIpBlocked(ip)
  return NextResponse.json({
    blocked: !!blocked,
    reason: blocked?.reason ?? null,
    ip: ip
  })
}

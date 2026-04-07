import { NextResponse } from "next/server"
import { getClientIp } from "@/lib/inspectSecurity"

export async function GET(req: Request) {
    const ip = getClientIp(req)
    return NextResponse.json({ ip })
}

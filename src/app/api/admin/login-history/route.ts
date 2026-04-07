import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getAdminLoginHistory } from "@/lib/adminLoginHistory"

export const dynamic = "force-dynamic"

export async function GET() {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    const history = await getAdminLoginHistory(50)
    return NextResponse.json({ ok: true, data: history })
}

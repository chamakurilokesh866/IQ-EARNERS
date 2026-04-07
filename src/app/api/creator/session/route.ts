import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCreatorByEmail } from "@/lib/creators"
import { cookieOptions } from "@/lib/cookieOptions"

export async function POST(req: Request) {
    try {
        const { email } = await req.json()
        if (!email) return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 })

        const creator = await getCreatorByEmail(email)
        if (!creator || !creator.isApproved) {
            return NextResponse.json({ ok: false, error: "Not an approved creator" }, { status: 401 })
        }

        const res = NextResponse.json({ ok: true })
        res.cookies.set("creator_session", email, cookieOptions({
            maxAge: 60 * 60 * 24 * 7 // 7 days
        }))

        return res
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
    }
}

export async function GET() {
    const email = (await cookies()).get("creator_session")?.value
    if (!email) return NextResponse.json({ ok: false }, { status: 401 })

    const creator = await getCreatorByEmail(email)
    if (!creator || !creator.isApproved) return NextResponse.json({ ok: false }, { status: 401 })

    return NextResponse.json({ ok: true, creator })
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true })
    res.cookies.set("creator_session", "", { maxAge: 0 })
    return res
}

import { NextResponse } from "next/server"
import { getSponsorRequestByCode } from "@/lib/sponsors"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")?.trim() ?? ""
  if (!code) {
    return NextResponse.json({ ok: false, error: "code is required" }, { status: 400 })
  }

  const entry = await getSponsorRequestByCode(code)
  if (!entry) {
    return NextResponse.json({ ok: true, found: false })
  }

  return NextResponse.json({
    ok: true,
    found: true,
    data: {
      code: entry.code,
      name: entry.name,
      brand: entry.brand,
      kind: entry.kind,
      status: entry.status,
      adminReply: entry.adminReply ?? "",
      created_at: entry.created_at
    }
  })
}


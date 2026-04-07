import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const data = url.searchParams.get("data") || ""
    const size = url.searchParams.get("s") || "180"
    if (!data) return NextResponse.json({ ok: false, error: "data required" }, { status: 400 })
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
    const res = await fetch(qrUrl)
    const buf = await res.arrayBuffer()
    return new NextResponse(Buffer.from(buf), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600"
      }
    })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

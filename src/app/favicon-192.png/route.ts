import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET() {
  const filePath = path.join(process.cwd(), "src", "app", "prizes", "icon.png")
  try {
    const buf = await fs.readFile(filePath)
    return new NextResponse(buf, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } })
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 })
  }
}

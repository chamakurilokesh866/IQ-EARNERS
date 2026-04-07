import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const DATA_PATH = path.join(process.cwd(), "src", "data", "affiliate-links.json")

export type AffiliateLink = {
  id: string
  title: string
  description: string
  url: string
  imageUrl?: string
  category: string
  commission?: string
  clicks: number
  impressions: number
  enabled: boolean
  created_at: number
}

async function readLinks(): Promise<AffiliateLink[]> {
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeLinks(arr: AffiliateLink[]): Promise<void> {
  const dir = path.dirname(DATA_PATH)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
  await fs.writeFile(DATA_PATH, JSON.stringify(arr, null, 2), "utf-8")
}

export async function GET() {
  const links = await readLinks()
  const publicLinks = links.filter((l) => l.enabled).map(({ clicks, impressions, ...rest }) => rest)
  return NextResponse.json({ ok: true, data: publicLinks }, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=120" }
  })
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const { title, description, url, imageUrl, category, commission } = body
  if (!title || !url) return NextResponse.json({ ok: false, error: "title and url required" }, { status: 400 })
  const links = await readLinks()
  const link: AffiliateLink = {
    id: `afl_${Date.now()}`,
    title: String(title).slice(0, 200),
    description: String(description ?? "").slice(0, 500),
    url: String(url).slice(0, 2000),
    imageUrl: imageUrl ? String(imageUrl).slice(0, 2000) : undefined,
    category: String(category ?? "general").slice(0, 50),
    commission: commission ? String(commission).slice(0, 50) : undefined,
    clicks: 0,
    impressions: 0,
    enabled: true,
    created_at: Date.now()
  }
  links.push(link)
  await writeLinks(links)
  return NextResponse.json({ ok: true, data: link })
}

export async function PUT(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const body = await req.json().catch(() => ({}))
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 })
  const links = await readLinks()
  const idx = links.findIndex((l) => l.id === id)
  if (idx === -1) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 })
  const safe = ["title", "description", "url", "imageUrl", "category", "commission", "enabled"] as const
  for (const key of safe) {
    if (updates[key] !== undefined) (links[idx] as any)[key] = updates[key]
  }
  await writeLinks(links)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 })
  const links = await readLinks()
  const filtered = links.filter((l) => l.id !== id)
  await writeLinks(filtered)
  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"

const DATA_DIR = path.join(process.cwd(), "src", "data")
const BACKUP_DIR = path.join(process.cwd(), "src", "backups")
const KEEP_COUNT = Number(process.env.BACKUP_KEEP_COUNT ?? 10)

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
  await fs.mkdir(BACKUP_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const target = path.join(BACKUP_DIR, stamp)
  await fs.mkdir(target, { recursive: true })
  const files = await fs.readdir(DATA_DIR).catch(() => [])
  for (const f of files) {
    if (!f.endsWith(".json")) continue
    const src = path.join(DATA_DIR, f)
    const dest = path.join(target, f)
    await fs.copyFile(src, dest).catch(() => {})
  }
  const folders = (await fs.readdir(BACKUP_DIR)).filter((d) => d && d !== ".DS_Store").sort()
  const toRemove = folders.slice(0, Math.max(0, folders.length - KEEP_COUNT))
  for (const d of toRemove) {
    const dir = path.join(BACKUP_DIR, d)
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
  return NextResponse.json({ ok: true, path: target })
}

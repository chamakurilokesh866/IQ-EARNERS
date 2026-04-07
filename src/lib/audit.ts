import { promises as fs } from "fs"
import path from "path"

const LOG_DIR = path.join(process.cwd(), "src", "logs")
const KEEP_DAYS = Number(process.env.AUDIT_LOG_KEEP_DAYS ?? 7)

async function ensureDir() {
  await fs.mkdir(LOG_DIR, { recursive: true })
}

async function pruneOld() {
  const files = await fs.readdir(LOG_DIR).catch(() => [])
  const dated = files.filter((f) => f.startsWith("audit-") && f.endsWith(".log")).sort()
  if (!dated.length) return
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000
  await Promise.all(
    dated.map(async (f) => {
      const fp = path.join(LOG_DIR, f)
      const stat = await fs.stat(fp).catch(() => null)
      if (stat && stat.mtimeMs < cutoff) {
        await fs.unlink(fp).catch(() => {})
      }
    })
  )
}

export async function audit(req: Request, action: string, meta: Record<string, any> = {}) {
  await ensureDir()
  await pruneOld()
  const d = new Date()
  const name = `audit-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.log`
  const file = path.join(LOG_DIR, name)
  const ip = (req as any).headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || (req as any).headers?.get?.("x-real-ip") || "unknown"
  const line = JSON.stringify({ ts: Date.now(), action, ip, meta })
  await fs.appendFile(file, line + "\n", "utf-8").catch(() => {})
}

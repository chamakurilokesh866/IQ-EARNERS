import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSettings } from "@/lib/settings"
import { promises as fs } from "fs"
import path from "path"

const LOCK_FILE = path.join(process.cwd(), "src", "data", "admin-lock.json")
const LOG_DIR = path.join(process.cwd(), "src", "logs")
const ERROR_THRESHOLD = 10
const WINDOW_MS = 60 * 60 * 1000

export type SecurityAlert = {
  id: string
  severity: "info" | "warning" | "critical"
  title: string
  desc: string
  time: string
  status: "open" | "resolved"
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
  return new Date(ts).toLocaleDateString()
}

async function readAdminLock(): Promise<{ lockedUntil: number; failedAttempts: number }> {
  try {
    const txt = await fs.readFile(LOCK_FILE, "utf-8")
    const d = JSON.parse(txt)
    return {
      lockedUntil: Number(d.lockedUntil) || 0,
      failedAttempts: Number(d.failedAttempts) || 0
    }
  } catch {
    return { lockedUntil: 0, failedAttempts: 0 }
  }
}

async function countRecentErrors(): Promise<{ count: number; latestTs: number }> {
  let count = 0
  let latestTs = 0
  const cutoff = Date.now() - WINDOW_MS
  try {
    const files = await fs.readdir(LOG_DIR).catch(() => [])
    const errorFiles = files.filter((f) => f.startsWith("errors-") && f.endsWith(".log")).sort().reverse().slice(0, 3)
    for (const f of errorFiles) {
      const fp = path.join(LOG_DIR, f)
      const txt = await fs.readFile(fp, "utf-8").catch(() => "")
      for (const line of txt.split("\n").filter(Boolean)) {
        try {
          const row = JSON.parse(line)
          const ts = Number(row?.ts) || 0
          if (ts >= cutoff) {
            count++
            if (ts > latestTs) latestTs = ts
          }
        } catch {
          // skip malformed
        }
      }
    }
  } catch {}
  return { count, latestTs }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const alerts: SecurityAlert[] = []
  const now = Date.now()

  const [lock, settings, errors] = await Promise.all([
    readAdminLock(),
    getSettings().catch(() => ({})),
    countRecentErrors()
  ])

  if (lock.lockedUntil > now) {
    const mins = Math.ceil((lock.lockedUntil - now) / 60000)
    alerts.push({
      id: "admin-lock",
      severity: "critical",
      title: "Admin Dashboard Locked",
      desc: `Too many failed OTP attempts. Unlocks in ~${mins} min.`,
      time: formatTime(lock.lockedUntil - 3 * 60 * 1000),
      status: "open"
    })
  } else if (lock.failedAttempts > 0) {
    alerts.push({
      id: "admin-failed-attempts",
      severity: "warning",
      title: "Recent Failed Admin Login Attempts",
      desc: `${lock.failedAttempts} failed OTP attempt(s) in last session.`,
      time: "Recent",
      status: "open"
    })
  }

  if (Boolean((settings as Record<string, unknown>)?.maintenanceMode)) {
    alerts.push({
      id: "maintenance-on",
      severity: "info",
      title: "Maintenance Mode Active",
      desc: "Site is in maintenance mode. Non-admins see the maintenance page.",
      time: "Active",
      status: "open"
    })
  }

  if (errors.count >= ERROR_THRESHOLD) {
    alerts.push({
      id: "error-spike",
      severity: "warning",
      title: "Error Spike Detected",
      desc: `${errors.count} client errors logged in the last hour.`,
      time: errors.latestTs ? formatTime(errors.latestTs) : "Recent",
      status: "open"
    })
  }

  return NextResponse.json({ ok: true, data: alerts })
}

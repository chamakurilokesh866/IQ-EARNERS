/**
 * Shared website health check for Admin AI and website-health API.
 */
import { createServerSupabase } from "@/lib/supabase"
import { promises as fs } from "fs"
import path from "path"

const LOG_DIR = path.join(process.cwd(), "src", "logs")
const LOCK_FILE = path.join(process.cwd(), "src", "data", "admin-lock.json")

export async function getWebsiteHealth() {
  const [db, securityAlerts, errorCount] = await Promise.all([
    getDbStatus(),
    getSecurityAlerts(),
    getErrorLogCount()
  ])

  const issues: string[] = []
  if (!db.connected) issues.push(`Database: ${db.error || "Not connected"}`)
  securityAlerts.forEach((a) => issues.push(`Security: ${a.title} - ${a.desc}`))
  if (errorCount >= 10) issues.push(`Error log: ${errorCount} client errors in last hour`)

  return {
    db,
    securityAlerts,
    errorLogCountLastHour: errorCount,
    issues,
    overallHealthy: issues.length === 0
  }
}

async function getDbStatus() {
  const supabase = createServerSupabase()
  const hasEnv = !!(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  if (!hasEnv) return { connected: false, source: "none", error: "Supabase not configured" }
  if (!supabase) return { connected: false, source: "supabase", error: "Client creation failed" }
  try {
    const { error } = await supabase.from("quizzes").select("id").limit(1)
    return { connected: !error, source: "supabase", error: error?.message }
  } catch (e) {
    return { connected: false, source: "supabase", error: (e as Error).message }
  }
}

async function getSecurityAlerts() {
  const alerts: { severity: string; title: string; desc: string }[] = []
  try {
    const txt = await fs.readFile(LOCK_FILE, "utf-8").catch(() => "{}")
    const lock = JSON.parse(txt)
    const lockedUntil = Number(lock.lockedUntil) || 0
    const failedAttempts = Number(lock.failedAttempts) || 0
    if (lockedUntil > Date.now()) {
      alerts.push({ severity: "critical", title: "Admin Dashboard Locked", desc: "Too many failed OTP attempts" })
    } else if (failedAttempts > 0) {
      alerts.push({ severity: "warning", title: "Recent Failed Admin Logins", desc: `${failedAttempts} failed OTP attempt(s)` })
    }
  } catch {}
  return alerts
}

async function getErrorLogCount() {
  let count = 0
  const cutoff = Date.now() - 60 * 60 * 1000
  try {
    const files = await fs.readdir(LOG_DIR).catch(() => [])
    const errorFiles = files.filter((f) => f.startsWith("errors-") && f.endsWith(".log")).sort().reverse().slice(0, 3)
    for (const f of errorFiles) {
      const fp = path.join(LOG_DIR, f)
      const txt = await fs.readFile(fp, "utf-8").catch(() => "")
      for (const line of txt.split("\n").filter(Boolean)) {
        try {
          const row = JSON.parse(line)
          if ((Number(row?.ts) || 0) >= cutoff) count++
        } catch {}
      }
    }
  } catch {}
  return count
}

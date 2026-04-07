/**
 * Inspect/DevTools security: alerts, IP blocking, appeals.
 */
import { createServerSupabase } from "./supabase"

export type InspectAlert = {
  id: string
  ip: string
  user_agent: string
  username: string
  page_url: string
  created_at: number
  blocked_at?: number
}

export type BlockedIp = { ip: string; reason: string; blocked_at: number; alert_id?: string }

export function getClientIp(req: Request): string {
  const headers = req.headers
  const xff = headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0]?.trim() ?? "unknown"
  const xri = headers.get("x-real-ip")
  if (xri) return xri.trim()
  const cf = headers.get("cf-connecting-ip")
  if (cf) return cf.trim()
  return "unknown"
}

export async function recordInspectAlert(
  req: Request,
  data: { username?: string; page_url?: string }
): Promise<boolean> {
  const ip = getClientIp(req)
  const userAgent = req.headers.get("user-agent") ?? ""
  const supabase = createServerSupabase()
  if (!supabase) return false
  try {
    const id = "ia-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10)
    const { error } = await supabase.from("inspect_alerts").insert({
      id,
      ip,
      user_agent: userAgent.slice(0, 500),
      username: data.username ?? "",
      page_url: data.page_url ?? "",
      created_at: Date.now()
    })
    return !error
  } catch {
    return false
  }
}

export async function isIpBlocked(ip: string): Promise<BlockedIp | null> {
  const supabase = createServerSupabase()
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from("blocked_ips")
      .select("ip, reason, blocked_at, alert_id")
      .eq("ip", ip)
      .limit(1)
      .maybeSingle()
    if (!error && data) {
      return { ip: data.ip, reason: data.reason ?? "", blocked_at: Number(data.blocked_at ?? 0), alert_id: data.alert_id }
    }
  } catch { }
  return null
}

export async function blockIp(ip: string, alertId?: string): Promise<boolean> {
  const supabase = createServerSupabase()
  if (!supabase) return false
  try {
    const { error } = await supabase.from("blocked_ips").upsert(
      { ip, reason: "Unauthorized use of developer tools", blocked_at: Date.now(), alert_id: alertId ?? null },
      { onConflict: "ip" }
    )
    if (!error && alertId) {
      await supabase.from("inspect_alerts").update({ blocked_at: Date.now() }).eq("id", alertId)
    }
    return !error
  } catch {
    return false
  }
}

export async function unblockIp(ip: string): Promise<boolean> {
  const supabase = createServerSupabase()
  if (!supabase) return false
  try {
    const { error } = await supabase.from("blocked_ips").delete().eq("ip", ip)
    return !error
  } catch {
    return false
  }
}

export async function getInspectAlerts(limit = 100): Promise<InspectAlert[]> {
  const supabase = createServerSupabase()
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from("inspect_alerts")
      .select("id, ip, user_agent, username, page_url, created_at, blocked_at")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (!error && Array.isArray(data)) {
      return data.map((r) => ({
        id: r.id,
        ip: r.ip ?? "",
        user_agent: r.user_agent ?? "",
        username: r.username ?? "",
        page_url: r.page_url ?? "",
        created_at: Number(r.created_at ?? 0),
        blocked_at: r.blocked_at ? Number(r.blocked_at) : undefined
      }))
    }
  } catch { }
  return []
}

export async function getBlockedIps(): Promise<BlockedIp[]> {
  const supabase = createServerSupabase()
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from("blocked_ips").select("ip, reason, blocked_at, alert_id").order("blocked_at", { ascending: false })
    if (!error && Array.isArray(data)) {
      return data.map((r) => ({ ip: r.ip, reason: r.reason ?? "", blocked_at: Number(r.blocked_at ?? 0), alert_id: r.alert_id }))
    }
  } catch { }
  return []
}



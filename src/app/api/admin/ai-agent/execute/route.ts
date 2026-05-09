import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { invalidatePracticeQuizCache } from "@/lib/practiceQuizCache"
import { blockUser, removeBlockedUser } from "@/lib/blocked"
import { getSettings, updateSettings } from "@/lib/settings"

function normalize(input: string): string {
  return String(input ?? "").trim().toLowerCase()
}

function parseNumberCommand(command: string, keys: string[]): number | null {
  const c = normalize(command)
  if (!keys.some((k) => c.includes(k))) return null
  const m = c.match(/(\d{1,6})/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function parseBooleanCommand(command: string, keys: string[]): boolean | null {
  const c = normalize(command)
  if (!keys.some((k) => c.includes(k))) return null
  if (/\b(on|enable|enabled|true|start)\b/.test(c)) return true
  if (/\b(off|disable|disabled|false|stop)\b/.test(c)) return false
  return null
}

function parseUsername(command: string, verbs: string[]): string | null {
  const c = normalize(command)
  const verb = verbs.find((v) => c.startsWith(v + " ") || c.includes(v + " user "))
  if (!verb) return null
  const cleaned = c
    .replace(verb, "")
    .replace(/\buser\b/g, "")
    .trim()
    .replace(/^@+/, "")
  if (!cleaned) return null
  return cleaned.slice(0, 60)
}

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Admin required" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const command = String(body?.command ?? "").trim()
  if (!command) return NextResponse.json({ ok: false, error: "command is required" }, { status: 400 })

  const c = normalize(command)

  try {
    // 1) Cache clear
    if (/\b(clear|refresh|invalidate)\b/.test(c) && /\bcache\b/.test(c)) {
      invalidatePracticeQuizCache()
      revalidatePath("/", "layout")
      revalidatePath("/")
      return NextResponse.json({ ok: true, action: "clear_cache", message: "Cache cleared and homepage revalidated." })
    }

    // 2) Entry fee
    const entryFee = parseNumberCommand(c, ["entry fee", "platform fee", "set fee"])
    if (entryFee != null) {
      const next = Math.max(1, Math.min(100000, entryFee))
      const ok = await updateSettings({ entryFee: next })
      if (!ok) return NextResponse.json({ ok: false, error: "Could not update entry fee" }, { status: 500 })
      return NextResponse.json({ ok: true, action: "set_entry_fee", message: `Entry fee updated to ₹${next}.`, data: { entryFee: next } })
    }

    // 3) Maintenance mode
    const maintenance = parseBooleanCommand(c, ["maintenance mode", "maintenance"])
    if (maintenance != null) {
      const ok = await updateSettings({ maintenanceMode: maintenance })
      if (!ok) return NextResponse.json({ ok: false, error: "Could not update maintenance mode" }, { status: 500 })
      return NextResponse.json({
        ok: true,
        action: "set_maintenance_mode",
        message: maintenance ? "Maintenance mode enabled." : "Maintenance mode disabled.",
        data: { maintenanceMode: maintenance }
      })
    }

    // 4) VIP modal toggle
    const vip = parseBooleanCommand(c, ["vip modal", "promo modal", "popup"])
    if (vip != null) {
      const ok = await updateSettings({ vipModalEnabled: vip })
      if (!ok) return NextResponse.json({ ok: false, error: "Could not update VIP modal" }, { status: 500 })
      return NextResponse.json({
        ok: true,
        action: "set_vip_modal",
        message: vip ? "VIP modal enabled." : "VIP modal disabled.",
        data: { vipModalEnabled: vip }
      })
    }

    // 5) Block / unblock users
    const blockU = parseUsername(c, ["block", "ban"])
    if (blockU) {
      const ok = await blockUser(blockU, "Blocked by admin AI agent command")
      return NextResponse.json({
        ok,
        action: "block_user",
        message: ok ? `User "${blockU}" blocked.` : `Could not block "${blockU}".`
      })
    }
    const unblockU = parseUsername(c, ["unblock", "unban"])
    if (unblockU) {
      const ok = await removeBlockedUser(unblockU)
      return NextResponse.json({
        ok,
        action: "unblock_user",
        message: ok ? `User "${unblockU}" unblocked.` : `User "${unblockU}" is not blocked.`
      })
    }

    // 6) Read status command
    if (/\b(show|get|status)\b/.test(c) && /\bsettings|entry fee|maintenance|vip\b/.test(c)) {
      const s = await getSettings()
      return NextResponse.json({
        ok: true,
        action: "read_settings",
        message: "Current key settings loaded.",
        data: {
          entryFee: Number(s.entryFee ?? 100),
          maintenanceMode: Boolean(s.maintenanceMode),
          vipModalEnabled: Boolean(s.vipModalEnabled)
        }
      })
    }

    return NextResponse.json({
      ok: false,
      error:
        "Unsupported command. Try: 'set entry fee to 120', 'maintenance mode on', 'vip modal off', 'clear cache', 'block user alice123', 'unblock user alice123', 'show settings'."
    }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Command failed"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

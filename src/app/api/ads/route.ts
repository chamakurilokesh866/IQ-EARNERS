import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"
import { createServerSupabase } from "@/lib/supabase"

const DATA_PATH = path.join(process.cwd(), "src", "data", "ads.json")
const SETTINGS_ADS_ID = "ads"

export type AdSlot = {
  id: string
  name: string
  size: string
  page: string
  html: string
  enabled: boolean
}

export type AdsConfig = {
  enabled: boolean
  adsenseClientId: string
  adsenseSlotId: string
  slots: AdSlot[]
  popupHideOnPaths?: string[]
  popupDelayMs?: number
  popupEnabled?: boolean
}

const DEFAULT_SLOTS: AdSlot[] = [
  { id: "home_top", name: "Home Top", size: "728×90", page: "home", html: "", enabled: true },
  { id: "home_mid", name: "Home Mid", size: "728×90", page: "home", html: "", enabled: true },
  { id: "home_bottom", name: "Home Bottom", size: "728×90", page: "home", html: "", enabled: true },
  { id: "home_sidebar_1", name: "Home Sidebar 1", size: "300×250", page: "home", html: "", enabled: true },
  { id: "home_sidebar_2", name: "Home Sidebar 2", size: "300×250", page: "home", html: "", enabled: true },
  { id: "intro_mid", name: "Intro Mid (no popup on intro)", size: "728×90", page: "intro", html: "", enabled: true },
  { id: "leaderboard_top", name: "Leaderboard Top", size: "728×90", page: "leaderboard", html: "", enabled: true },
  { id: "leaderboard_sidebar", name: "Leaderboard Sidebar", size: "300×250", page: "leaderboard", html: "", enabled: true },
  { id: "prizes_top", name: "Prizes Top", size: "728×90", page: "prizes", html: "", enabled: true },
  { id: "prizes_mid", name: "Prizes Mid", size: "300×250", page: "prizes", html: "", enabled: true },
  { id: "tournament_top", name: "Tournaments Top", size: "728×90", page: "tournaments", html: "", enabled: true },
  { id: "tournament_mid", name: "Tournaments Mid", size: "300×250", page: "tournaments", html: "", enabled: true },
  { id: "quiz_between", name: "Quiz In-Between", size: "728×90", page: "daily-quiz", html: "", enabled: true },
  { id: "quiz_bottom", name: "Quiz Bottom", size: "728×90", page: "daily-quiz", html: "", enabled: true },
  { id: "dashboard_sidebar", name: "Dashboard Sidebar", size: "300×250", page: "user", html: "", enabled: true },
  { id: "dashboard_bottom", name: "Dashboard Bottom", size: "728×90", page: "user", html: "", enabled: true },
  { id: "popup_modal", name: "Popup Modal (never on intro)", size: "auto", page: "popup", html: "", enabled: true },
  { id: "footer_banner", name: "Footer Banner", size: "728×90", page: "footer", html: "", enabled: true },
  { id: "left_rail", name: "Left Rail (vertical)", size: "160×600", page: "rail", html: "", enabled: true },
  { id: "right_rail", name: "Right Rail (vertical)", size: "160×600", page: "rail", html: "", enabled: true },
]

const DEFAULT_CONFIG: AdsConfig = {
  enabled: false,
  adsenseClientId: "",
  adsenseSlotId: "",
  slots: DEFAULT_SLOTS,
  popupHideOnPaths: ["/intro", "/maintenance", "/create-username", "/login", "/payment", "/more/admin"],
  popupDelayMs: 5000,
  popupEnabled: true,
}

function migrateOldConfig(old: any): AdsConfig {
  const slots = [...DEFAULT_SLOTS]
  if (Array.isArray(old.snippets)) {
    old.snippets.forEach((s: any, i: number) => {
      if (i < slots.length && s.html) {
        slots[i].html = s.html
        slots[i].name = s.name || slots[i].name
      }
    })
  }
  return {
    enabled: !!old.enabled,
    adsenseClientId: old.adsenseClientId ?? "",
    adsenseSlotId: old.adsenseSlotId ?? "",
    slots,
    popupHideOnPaths: DEFAULT_CONFIG.popupHideOnPaths,
    popupDelayMs: DEFAULT_CONFIG.popupDelayMs,
    popupEnabled: DEFAULT_CONFIG.popupEnabled,
  }
}

function normalizeConfig(data: any): AdsConfig {
  if (!data || typeof data !== "object") return DEFAULT_CONFIG
  if (!Array.isArray(data.slots)) return migrateOldConfig(data)
  const mergedSlots = [...DEFAULT_SLOTS]
  data.slots.forEach((s: any) => {
    const id = String(s?.id ?? "")
    const idx = mergedSlots.findIndex((x) => x.id === id)
    const entry = {
      id,
      name: String(s?.name ?? mergedSlots.find((x) => x.id === id)?.name ?? id),
      size: String(s?.size ?? "auto"),
      page: String(s?.page ?? "home"),
      html: String(s?.html ?? ""),
      enabled: !!s?.enabled,
    }
    if (idx >= 0) mergedSlots[idx] = { ...mergedSlots[idx], ...entry }
    else mergedSlots.push(entry)
  })
  return {
    enabled: typeof data.enabled === "boolean" ? data.enabled : DEFAULT_CONFIG.enabled,
    adsenseClientId: typeof data.adsenseClientId === "string" ? data.adsenseClientId : DEFAULT_CONFIG.adsenseClientId,
    adsenseSlotId: typeof data.adsenseSlotId === "string" ? data.adsenseSlotId : DEFAULT_CONFIG.adsenseSlotId,
    slots: mergedSlots,
    popupHideOnPaths: Array.isArray(data.popupHideOnPaths) ? data.popupHideOnPaths.map((p: any) => String(p).trim()).filter(Boolean) : DEFAULT_CONFIG.popupHideOnPaths,
    popupDelayMs: typeof data.popupDelayMs === "number" ? data.popupDelayMs : DEFAULT_CONFIG.popupDelayMs,
    popupEnabled: typeof data.popupEnabled === "boolean" ? data.popupEnabled : DEFAULT_CONFIG.popupEnabled,
  }
}

/** Read from Supabase (production) or file (local). */
async function readConfig(): Promise<AdsConfig> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("settings").select("data").eq("id", SETTINGS_ADS_ID).single()
      if (!error && data?.data) return normalizeConfig(data.data)
    } catch {}
  }
  try {
    const txt = await fs.readFile(DATA_PATH, "utf-8")
    const data = JSON.parse(txt || "{}")
    return normalizeConfig(data)
  } catch {
    return DEFAULT_CONFIG
  }
}

/** Write to Supabase first; if no Supabase or write fails, try file (fails on read-only FS). */
async function writeConfig(config: AdsConfig): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ id: SETTINGS_ADS_ID, data: config, updated_at: Date.now() }, { onConflict: "id" })
      if (!error) return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message || "Supabase write failed" }
    }
  }
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(config, null, 2), "utf-8")
    return { ok: true }
  } catch (e: any) {
    if (e?.code === "EROFS" || e?.code === "EACCES") {
      return { ok: false, error: "Ads cannot be saved on this server (read-only). Configure Supabase (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) to save ads in production." }
    }
    return { ok: false, error: e?.message || "Failed to write ads config" }
  }
}

export async function GET() {
  try {
    const config = await readConfig()
    return NextResponse.json({ ok: true, data: config })
  } catch (err) {
    console.error("[api/ads] GET error:", err)
    return NextResponse.json({ ok: true, data: DEFAULT_CONFIG })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { Allow: "GET, PUT, OPTIONS" } })
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
    }
    const current = await readConfig()
    const next: AdsConfig = {
      ...current,
      enabled: typeof body.enabled === "boolean" ? body.enabled : current.enabled,
      adsenseClientId: typeof body.adsenseClientId === "string" ? body.adsenseClientId : current.adsenseClientId,
      adsenseSlotId: typeof body.adsenseSlotId === "string" ? body.adsenseSlotId : current.adsenseSlotId,
      slots: Array.isArray(body.slots)
        ? body.slots.map((s: any) => ({
            id: String(s.id ?? ""),
            name: String(s.name ?? ""),
            size: String(s.size ?? "auto"),
            page: String(s.page ?? "home"),
            html: String(s.html ?? ""),
            enabled: !!s.enabled,
          }))
        : current.slots,
      popupHideOnPaths: Array.isArray(body.popupHideOnPaths) ? body.popupHideOnPaths.map((p: any) => String(p).trim()).filter(Boolean) : current.popupHideOnPaths,
      popupDelayMs: typeof body.popupDelayMs === "number" ? body.popupDelayMs : current.popupDelayMs,
      popupEnabled: typeof body.popupEnabled === "boolean" ? body.popupEnabled : current.popupEnabled,
    }
    const result = await writeConfig(next)
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    return NextResponse.json({ ok: true, data: next })
  } catch (err: any) {
    console.error("[api/ads] PUT error:", err)
    return NextResponse.json({ ok: false, error: err?.message || "Failed to save ads" }, { status: 500 })
  }
}

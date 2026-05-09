/**
 * Settings storage: Supabase (production/Vercel) with file fallback (local dev).
 * Vercel has read-only filesystem, so settings must use Supabase there.
 */
import { createServerSupabase } from "./supabase"
import type { EnterpriseState } from "./enterpriseState"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "settings.json")

export type BlockedUserEntry = { username: string; reason: string; blockedAt: number }

export type SettingsData = Record<string, unknown> & {
  currency?: string
  entryFee?: number
  /** Percent of each paid tournament entry recorded as platform fee in the money ledger (0–100). */
  platformFeePercentTournament?: number
  targetAudience?: number
  progressBaseCount?: number
  timePerQuestion?: number
  showDemoQuestions?: boolean
  useResendEmails?: boolean
  maintenanceMode?: boolean
  /** Custom message shown on maintenance page */
  maintenanceMessage?: string
  /** Estimated end time (timestamp). When passed, maintenance page can show countdown. */
  maintenanceUntil?: number
  qrImageUrl?: string
  blockedAmount?: number
  blockedQrUrl?: string
  upiId?: string
  upi_id?: string
  certFirst?: string
  certRunnerUp?: string
  certParticipation?: string
  blockedUsers?: BlockedUserEntry[]
  createUsernameOtpLength?: 4 | 6
  /** Max number of questions allowed per AI generation (admin control). */
  aiQuestionLimit?: number
  /** If true, AI quiz generation should target school students (classes 1–12) and include math problems. */
  aiStudentQuizMode?: boolean
  /** Optional free-text description for student quiz range, e.g. "Class 1–12". */
  aiStudentClassRange?: string
  /** Latest broadcast notice (banner). */
  latestNotice?: { id: string; title: string; body: string; url?: string; created_at: number }
  /** SEO verification codes for Search Console / Webmaster Tools. Managed in admin dashboard. */
  seoVerification?: { google?: string; bing?: string; yandex?: string }
  /** Navbar layout: "vertical" = left sidebar on desktop, "horizontal" = top navbar only. */
  navbarLayout?: "horizontal" | "vertical"
  /** Live quiz daily start hour (0–23, default 20 = 8 PM). */
  liveQuizHour?: number
  /** Live quiz daily start minute (0–59). */
  liveQuizMinute?: number
  /** When true, show a VIP promotional modal on the home page. */
  vipModalEnabled?: boolean
  /** Image URL for the VIP modal. */
  vipModalImage?: string
  /** Link for the VIP modal (e.g., tournament or subscription). */
  vipModalLink?: string
  /** Custom title for the VIP modal. */
  vipModalTitle?: string
  /** Custom button text for the VIP modal. */
  vipModalButtonText?: string
  /** If true, the TS EAMCET / AP EAPCET Mock Exam feature is turned on */
  tsEamcetMockExamEnabled?: boolean
  /** URL to the user-uploaded PDF for the Mock Exam */
  tsEamcetMockExamPdfUrl?: string
  /** Duration in minutes for the mock exam. Default 180 (3 hours). */
  tsEamcetMockExamDurationMin?: number
  /** If true, the Creator Hub is globally accessible. If false, it's hidden and disabled. */
  creatorHubEnabled?: boolean
  /** If false, the language selection in the start quiz modal is hidden and defaults to English. */
  languageSelectionEnabled?: boolean
  /** Social media float buttons: enabled and links */
  socialMediaEnabled?: boolean
  socialMediaLinks?: {
    instagram?: string
    facebook?: string
    twitter?: string
    youtube?: string
    linkedin?: string
  }
  /** If true, developer options (right click, inspect, F12) are allowed globally */
  allowDeveloperOptions?: boolean
  /** Enable or disable automatic proctoring high-risk alerts to admins. */
  proctoringAlertsEnabled?: boolean
  /** Cooldown in minutes between repeated proctoring alerts for same queue snapshot. */
  proctoringAlertsCooldownMin?: number
  /** If true, send admin push notifications for proctoring alerts. */
  proctoringAlertsPush?: boolean
  /** If true, send admin email notifications for proctoring alerts. */
  proctoringAlertsEmail?: boolean
  /** Enterprise admin: orgs, API keys metadata, white-label, quiz mode flags, AI insights cache */
  enterpriseState?: EnterpriseState
}

const defaults: SettingsData = {
  currency: "INR",
  entryFee: 100,
  platformFeePercentTournament: 15,
  targetAudience: 100,
  useResendEmails: false,
  aiQuestionLimit: 20,
  aiStudentQuizMode: false,
  aiStudentClassRange: "Class 1–12",
  navbarLayout: "horizontal",
  vipModalEnabled: false,
  creatorHubEnabled: true,
  languageSelectionEnabled: true,
  progressBaseCount: 0,
  allowDeveloperOptions: false,
  proctoringAlertsEnabled: true,
  proctoringAlertsCooldownMin: 30,
  proctoringAlertsPush: true,
  proctoringAlertsEmail: true
}

async function readFromFile(): Promise<SettingsData> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    return { ...defaults, ...JSON.parse(txt || "{}") }
  } catch {
    return { ...defaults }
  }
}

async function writeToFile(data: SettingsData): Promise<void> {
  const dir = path.dirname(FILE_PATH)
  await fs.mkdir(dir, { recursive: true }).catch(() => { })
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8")
}

export async function getSettings(): Promise<SettingsData> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("settings").select("data").eq("id", "main").single()
      if (!error && data?.data) {
        const merged = { ...defaults, ...(data.data as object) }
        if (!merged.enterpriseState) {
          const { data: ent } = await supabase
            .from("enterprise_state_store")
            .select("data")
            .eq("id", "main")
            .maybeSingle()
          if (ent?.data) merged.enterpriseState = ent.data as EnterpriseState
        }
        if (!merged.upiId && !merged.upi_id && process.env.NEXT_PUBLIC_DEFAULT_UPI) {
          merged.upiId = process.env.NEXT_PUBLIC_DEFAULT_UPI
        }
        return merged
      }
    } catch { }
  }
  const fromFile = await readFromFile()
  if (!fromFile.upiId && !fromFile.upi_id && process.env.NEXT_PUBLIC_DEFAULT_UPI) {
    fromFile.upiId = process.env.NEXT_PUBLIC_DEFAULT_UPI
  }
  return fromFile
}

export async function updateSettings(partial: Partial<SettingsData>): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data: existing } = await supabase.from("settings").select("data").eq("id", "main").single()
      const current = (existing?.data as SettingsData) || {}
      const next = { ...current, ...partial }
      const { error } = await supabase
        .from("settings")
        .upsert({ id: "main", data: next, updated_at: Date.now() }, { onConflict: "id" })
      if (!error && partial.enterpriseState) {
        await supabase
          .from("enterprise_state_store")
          .upsert({ id: "main", data: partial.enterpriseState, updated_at: Date.now() }, { onConflict: "id" })
      }
      return !error
    } catch {
      return false
    }
  }
  try {
    const current = await readFromFile()
    const next = { ...current, ...partial }
    await writeToFile(next)
    return true
  } catch {
    return false
  }
}

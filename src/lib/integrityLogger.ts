/**
 * Server-side Smart Integrity Engine logger.
 * Writes to Supabase integrity_events. Fails silently if Supabase not configured.
 */
import { createServerSupabase } from "@/lib/supabase"

export async function logIntegrityEventServer(
  type: string,
  reason: string,
  meta: Record<string, unknown> = {},
  username?: string | null
): Promise<void> {
  const supabase = createServerSupabase()
  if (!supabase) return
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const { error } = await supabase.from("integrity_events").insert({
    id,
    username: username ?? null,
    type: String(type).slice(0, 64),
    reason: String(reason).slice(0, 512),
    meta: meta && typeof meta === "object" ? meta : {},
    created_at: Date.now()
  })
  if (error) console.error("[integrity] insert failed:", error.message)
}

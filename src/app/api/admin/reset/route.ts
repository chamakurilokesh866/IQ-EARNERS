import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"
import { getSettings, updateSettings } from "@/lib/settings"
import { createServerSupabase } from "@/lib/supabase"
import { clearEnrollments } from "@/lib/enrollments"

const DATA_DIR = path.join(process.cwd(), "src", "data")

export async function POST() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  let settingsUpdated = false
  let newRound = 1
  let supabaseCleared = false

  try {
    const settings = await getSettings()
    newRound = Number(settings?.round ?? 1) + 1
    settingsUpdated = await updateSettings({
      round: newRound,
      prizeCompleted: true,
      lastResetAt: Date.now(),
      progressBaseCount: 0
    })
  } catch {
    // Settings update failed
  }

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      await supabase.from("referrals").delete().neq("id", "")
      await supabase.from("profiles").delete().neq("uid", "")
      await supabase.from("payments").delete().neq("id", "")
      await supabase.from("leaderboard").delete().neq("id", "")
      await supabase.from("tournaments").delete().neq("id", "")
      await supabase.from("quizzes").delete().neq("id", "")
      await supabase.from("enrollments").delete().neq("id", "")
      await supabase.from("upi_request_state").upsert({
        id: "main",
        active: null,
        pending_next: null,
        history: [],
        updated_at: Date.now()
      }, { onConflict: "id" })
      supabaseCleared = true
    } catch {
      // Supabase clear failed
    }
  }

  try {
    await fs.writeFile(path.join(DATA_DIR, "leaderboard.json"), "[]", "utf-8")
    await fs.writeFile(path.join(DATA_DIR, "participants.json"), "[]", "utf-8")
    await fs.writeFile(
      path.join(DATA_DIR, "upi-requests.json"),
      JSON.stringify({ active: null, pendingNext: null, history: [] }, null, 2),
      "utf-8"
    )
    await clearEnrollments().catch(() => { })
    await fs.writeFile(path.join(DATA_DIR, "profiles.json"), "[]", "utf-8").catch(() => { })
    await fs.writeFile(path.join(DATA_DIR, "payments.json"), "[]", "utf-8").catch(() => { })
    await fs.writeFile(path.join(DATA_DIR, "referrals.json"), "[]", "utf-8").catch(() => { })
    await fs.writeFile(path.join(DATA_DIR, "tournaments.json"), "[]", "utf-8").catch(() => { })
    await fs.writeFile(path.join(DATA_DIR, "quizzes.json"), "[]", "utf-8").catch(() => { })
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e)
    const isReadOnly = /EACCES|EROFS|EPERM|read-only|readonly/i.test(msg)
    if (isReadOnly && (settingsUpdated || supabaseCleared)) {
      return NextResponse.json({
        ok: true,
        round: newRound,
        supabaseCleared,
        warning: "Settings and Supabase data cleared. File storage is read-only on Vercel; local JSON files were not reset."
      })
    }
    if (isReadOnly && !supabaseCleared && !settingsUpdated) {
      return NextResponse.json({
        ok: false,
        error: "Reset failed: file storage read-only and Supabase clear failed or not configured."
      }, { status: 500 })
    }
    if (isReadOnly) {
      return NextResponse.json({ ok: true, round: newRound, supabaseCleared })
    }
    throw e
  }

  return NextResponse.json({ ok: true, round: newRound, supabaseCleared })
}

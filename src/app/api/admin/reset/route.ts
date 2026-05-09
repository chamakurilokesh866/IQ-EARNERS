import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"
import { getSettings, updateSettings } from "@/lib/settings"
import { createServerSupabase } from "@/lib/supabase"
import { clearEnrollments } from "@/lib/enrollments"

const DATA_DIR = path.join(process.cwd(), "src", "data")

/** Clear quiz/tournament/ops data. Safe PK filters per table. */
async function clearSupabaseContentTables(supabase: NonNullable<ReturnType<typeof createServerSupabase>>) {
  const del = async (table: string, column: string) => {
    try {
      await supabase.from(table).delete().neq(column, "")
    } catch {
      /* table missing or RLS */
    }
  }
  await del("quiz_completions", "id")
  await del("user_stats", "username_lower")
  await del("integrity_events", "id")
  await del("inspect_alerts", "id")
  await del("active_quiz_sessions", "id")
  await del("enrollments", "id")
  await del("leaderboard", "id")
  await del("tournaments", "id")
  await del("quizzes", "id")
  await del("referrals", "id")
  await del("quiz_schedule", "id")
  await del("reports", "id")
  await del("notices", "id")
  await del("sponsor_requests", "id")
  await del("mock_exams", "id")
  await del("spins", "id")
  await del("active_sessions", "id")
  try {
    await supabase.from("upi_request_state").upsert(
      {
        id: "main",
        active: null,
        pending_next: null,
        history: [],
        updated_at: Date.now(),
      },
      { onConflict: "id" }
    )
  } catch {
    /* */
  }
}

/**
 * POST body:
 * - Full: `{ "confirm": "RESET_ALL_DATA" }` — profiles, payments, quizzes, everything.
 * - Content (no user accounts): `{ "confirm": "RESET_ADMIN_CONTENT", "mode": "content" }`
 * - Prize round (leaderboard / UPI flow): `{ "confirm": "RESET_PRIZE_ROUND", "mode": "round" }` — keeps profiles & payments & quizzes.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const modeRaw = String(body?.mode ?? "")
  const mode = modeRaw === "content" ? "content" : modeRaw === "round" ? "round" : "full"
  const confirm = String(body?.confirm ?? "")

  if (mode === "content") {
    if (confirm !== "RESET_ADMIN_CONTENT") {
      return NextResponse.json(
        {
          ok: false,
          error: 'Content reset: { "confirm": "RESET_ADMIN_CONTENT", "mode": "content" }',
        },
        { status: 400 }
      )
    }
  } else if (mode === "round") {
    if (confirm !== "RESET_PRIZE_ROUND") {
      return NextResponse.json(
        {
          ok: false,
          error: 'Round reset: { "confirm": "RESET_PRIZE_ROUND", "mode": "round" }',
        },
        { status: 400 }
      )
    }
  } else if (confirm !== "RESET_ALL_DATA") {
    return NextResponse.json(
      {
        ok: false,
        error: 'Full reset: { "confirm": "RESET_ALL_DATA" }',
      },
      { status: 400 }
    )
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
      progressBaseCount: 0,
    })
  } catch {
    // Settings update failed
  }

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      if (mode === "round") {
        await supabase.from("quiz_completions").delete().neq("id", "")
        await supabase.from("user_stats").delete().neq("username_lower", "")
        await supabase.from("enrollments").delete().neq("id", "")
        await supabase.from("active_quiz_sessions").delete().neq("id", "")
        await supabase.from("leaderboard").delete().neq("id", "")
        await supabase.from("referrals").delete().neq("id", "")
        await supabase.from("upi_request_state").upsert(
          {
            id: "main",
            active: null,
            pending_next: null,
            history: [],
            updated_at: Date.now(),
          },
          { onConflict: "id" }
        )
      } else {
        await clearSupabaseContentTables(supabase)
        if (mode === "full") {
          await supabase.from("profiles").delete().neq("uid", "")
          await supabase.from("payments").delete().neq("id", "")
        }
      }
      supabaseCleared = true
    } catch {
      // Supabase clear failed partially
    }
  }

  const writeContentFiles = async () => {
    await fs.writeFile(path.join(DATA_DIR, "leaderboard.json"), "[]", "utf-8")
    await fs.writeFile(path.join(DATA_DIR, "participants.json"), "[]", "utf-8")
    await fs.writeFile(
      path.join(DATA_DIR, "upi-requests.json"),
      JSON.stringify({ active: null, pendingNext: null, history: [] }, null, 2),
      "utf-8"
    )
    await clearEnrollments().catch(() => {})
    await fs.writeFile(path.join(DATA_DIR, "referrals.json"), "[]", "utf-8").catch(() => {})
    await fs.writeFile(path.join(DATA_DIR, "tournaments.json"), "[]", "utf-8").catch(() => {})
    await fs.writeFile(path.join(DATA_DIR, "quizzes.json"), "[]", "utf-8").catch(() => {})
  }

  const writeFullFiles = async () => {
    await writeContentFiles()
    await fs.writeFile(path.join(DATA_DIR, "profiles.json"), "[]", "utf-8").catch(() => {})
    await fs.writeFile(path.join(DATA_DIR, "payments.json"), "[]", "utf-8").catch(() => {})
  }

  try {
    if (mode === "round") {
      await fs.writeFile(path.join(DATA_DIR, "leaderboard.json"), "[]", "utf-8")
      await fs.writeFile(path.join(DATA_DIR, "participants.json"), "[]", "utf-8")
      await fs.writeFile(
        path.join(DATA_DIR, "upi-requests.json"),
        JSON.stringify({ active: null, pendingNext: null, history: [] }, null, 2),
        "utf-8"
      )
      await fs.writeFile(path.join(DATA_DIR, "referrals.json"), "[]", "utf-8").catch(() => {})
      await clearEnrollments().catch(() => {})
    } else if (mode === "content") {
      await writeContentFiles()
    } else {
      await writeFullFiles()
    }
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e)
    const isReadOnly = /EACCES|EROFS|EPERM|read-only|readonly/i.test(msg)
    if (isReadOnly && (settingsUpdated || supabaseCleared)) {
      return NextResponse.json({
        ok: true,
        mode,
        round: newRound,
        supabaseCleared,
        warning: "Settings and Supabase data cleared. File storage is read-only on Vercel; local JSON files were not reset.",
      })
    }
    if (isReadOnly && !supabaseCleared && !settingsUpdated) {
      return NextResponse.json({
        ok: false,
        error: "Reset failed: file storage read-only and Supabase clear failed or not configured.",
      }, { status: 500 })
    }
    if (isReadOnly) {
      return NextResponse.json({ ok: true, mode, round: newRound, supabaseCleared })
    }
    throw e
  }

  return NextResponse.json({ ok: true, mode, round: newRound, supabaseCleared })
}

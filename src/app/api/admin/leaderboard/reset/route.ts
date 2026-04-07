import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerSupabase } from "@/lib/supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "leaderboard.json")

async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies()
    return store.get("role")?.value === "admin"
  } catch {
    return false
  }
}

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  try {
    const supabase = createServerSupabase()
    if (supabase) {
      const { error } = await supabase.from("leaderboard").delete().neq("id", "")
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    await fs.writeFile(FILE_PATH, "[]", "utf-8").catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Reset failed" }, { status: 500 })
  }
}

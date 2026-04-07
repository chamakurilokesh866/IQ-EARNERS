import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { promises as fs } from "fs"
import path from "path"
import { createServerSupabase } from "@/lib/supabase"
import { audit } from "@/lib/audit"
import { updateSettings } from "@/lib/settings"
import { clearEnrollments } from "@/lib/enrollments"

const DATA_DIR = path.join(process.cwd(), "src", "data")

export async function POST() {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  let cleared = false

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      await supabase.from("profiles").delete().neq("uid", "")
      await supabase.from("enrollments").delete().neq("id", "")
      cleared = true
    } catch {
      // Supabase clear failed
    }
  }

  await updateSettings({ progressBaseCount: 0 })
  await clearEnrollments().catch(() => { })

  try {
    await fs.writeFile(path.join(DATA_DIR, "profiles.json"), "[]", "utf-8")
    await fs.writeFile(path.join(DATA_DIR, "user-stats.json"), "{}", "utf-8").catch(() => { })
    cleared = true
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e)
    if (!/EACCES|EROFS|EPERM|read-only|readonly/i.test(msg)) throw e
  }

  await audit(new Request("https://local/api/admin/clear-users"), "clear_users", { cleared })

  return NextResponse.json({ ok: true, cleared })
}

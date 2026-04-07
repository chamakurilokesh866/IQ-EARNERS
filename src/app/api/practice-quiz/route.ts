import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getPracticeQuizCache, setPracticeQuizCache } from "@/lib/practiceQuizCache"
import { createServerSupabase } from "@/lib/supabase"

const DATA_PATH = path.join(process.cwd(), "src", "data", "practice_quiz.json")

export async function GET() {
  try {
    let cache = getPracticeQuizCache()
    if (!cache) {
      const supabase = createServerSupabase()
      if (supabase) {
        const { data } = await supabase.from("settings").select("data").eq("id", "practice_quiz").single()
        if (data?.data && Array.isArray(data.data)) {
          cache = data.data
        }
      }

      if (!cache) {
        try {
          const txt = await fs.readFile(DATA_PATH, "utf-8")
          const arr = JSON.parse(txt || "[]")
          cache = Array.isArray(arr) ? arr : []
        } catch {
          cache = []
        }
      }
      setPracticeQuizCache(cache!)
    }
    const res = NextResponse.json({ ok: true, data: cache })
    res.headers.set("Cache-Control", "public, max-age=600, s-maxage=600, stale-while-revalidate=1800")
    return res
  } catch {
    return NextResponse.json({ ok: true, data: [] }, { headers: { "Cache-Control": "public, max-age=60" } })
  }
}

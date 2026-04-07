import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabase()
    if (!supabase) return NextResponse.json({ ok: true, courses: [] })

    const { data: rows, error } = await supabase
      .from("mock_exams")
      .select("id, questions, created_at")

    if (error) return NextResponse.json({ ok: true, courses: [] })

    const courses: { id: string; name: string; modules: { name: string; count: number }[]; totalQuestions: number }[] = []
    for (const row of rows || []) {
      const q = row.questions
      if (!q) continue
      if (Array.isArray(q)) {
        if (q.length > 0) courses.push({ id: "main", name: "General Mock", modules: [{ name: "All", count: q.length }], totalQuestions: q.length })
      } else if (q && typeof q === "object" && Array.isArray((q as { modules?: unknown[] }).modules)) {
        const mods = (q as { modules: { name: string; questions?: unknown[] }[] }).modules
        const modules = mods.map((m) => ({ name: m.name || "Section", count: Array.isArray(m.questions) ? m.questions.length : 0 }))
        const total = modules.reduce((s, m) => s + m.count, 0)
        if (total > 0) {
          const labels: Record<string, string> = {
            mpc: "MPC (Engineering)",
            bipc: "BiPC (Medical)",
            cert: "Digital Certification (EMCERT/APCERT)"
          }
          courses.push({ id: row.id, name: labels[row.id] || row.id, modules, totalQuestions: total })
        }
      }
    }
    return NextResponse.json({ ok: true, courses })
  } catch {
    return NextResponse.json({ ok: true, courses: [] })
  }
}

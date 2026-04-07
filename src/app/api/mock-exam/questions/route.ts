import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase"

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabase()
    if (!supabase) return NextResponse.json({ ok: true, data: [], modules: null })

    const { searchParams } = new URL(req.url)
    const course = searchParams.get("course") || "main"

    const { data: mockExam, error } = await supabase
      .from("mock_exams")
      .select("questions")
      .eq("id", course)
      .single()

    if (error || !mockExam) return NextResponse.json({ ok: true, data: [], modules: null })

    const q = mockExam.questions

    // Legacy: flat array
    if (Array.isArray(q)) {
      const sanitized = q.map((item: { question?: string; options?: string[] }, i: number) => ({
        id: i,
        question: item?.question,
        options: item?.options || []
      }))
      return NextResponse.json({ ok: true, data: sanitized, modules: null, course })
    }

    // New: modules format
    const modData = q as { modules?: { name: string; questions: { question?: string; options?: string[] }[] }[] }
    if (!modData?.modules || !Array.isArray(modData.modules)) {
      return NextResponse.json({ ok: true, data: [], modules: null })
    }

    const modules: { name: string; questions: { id: number; question: string; options: string[] }[] }[] = []
    let globalId = 0
    for (const mod of modData.modules) {
      const modQuestions = (mod.questions || []).map((item: { question?: string; options?: string[] }) => ({
        id: globalId++,
        question: item?.question || "",
        options: item?.options || []
      }))
      if (modQuestions.length > 0) {
        modules.push({ name: mod.name || "Section", questions: modQuestions })
      }
    }
    const flatData = modules.flatMap((m) => m.questions)
    return NextResponse.json({ ok: true, data: flatData, modules, course })
  } catch {
    return NextResponse.json({ ok: true, data: [], modules: null })
  }
}

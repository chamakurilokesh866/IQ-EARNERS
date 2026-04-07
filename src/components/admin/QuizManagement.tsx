"use client"
import React, { useState, useEffect, useCallback } from "react"

// ─── Quiz Card Component ──────────────────────────────────────────────────────
export function QuizCard({
  id,
  title,
  category,
  difficulty,
  questions,
  scheduled,
  status,
  onDelete,
  onImportQuestions,
  onEdit,
  onPublish
}: {
  id?: string
  title: string
  category: string
  difficulty: "Easy" | "Medium" | "Hard"
  questions: number
  scheduled: string
  status: "Published" | "Draft"
  onDelete?: () => void
  onImportQuestions?: (quizId: string, file: File) => void
  onEdit?: () => void
  onPublish?: () => void
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        <span className={`pill ${status === "Published" ? "bg-success text-black" : "bg-navy-700"}`}>{status}</span>
      </div>
      <div className="mt-2 text-sm text-navy-300">{category} • <span className={difficulty === "Hard" ? "text-primary" : "text-success"}>{difficulty}</span></div>
      <div className="mt-1 text-sm text-navy-300">{questions} questions</div>
      <div className="mt-2 text-xs text-navy-300">Scheduled: {scheduled}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {onEdit && <button type="button" className="rounded bg-primary px-4 py-2 font-semibold" onClick={onEdit}>Edit Quiz</button>}
        {status !== "Published" && onPublish && <button type="button" className="rounded bg-success px-4 py-2 text-black font-semibold" onClick={onPublish}>Publish</button>}
        {id && onImportQuestions && (
          <label className="rounded bg-navy-700 px-4 py-2 cursor-pointer text-sm">
            <input hidden type="file" accept=".json,.csv" onChange={(e) => e.target.files?.[0] && onImportQuestions(id, e.target.files[0])} />
            Import Questions
          </label>
        )}
        {onDelete && <button title="Delete" onClick={onDelete}>🗑️</button>}
      </div>
    </div>
  )
}

// ─── Quiz Edit Modal ──────────────────────────────────────────────────────────
export function QuizEditModal({ quiz, onClose, onSave }: { quiz: any; onClose: () => void; onSave: (updates: { title?: string; category?: string; difficulty?: string; scheduled?: string; quiz_type?: string }) => void }) {
  const [title, setTitle] = useState(quiz?.title ?? "")
  const [category, setCategory] = useState(quiz?.category ?? "General")
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">((quiz?.difficulty ?? "Medium") as any)
  const [quizType, setQuizType] = useState<"daily" | "tournament">(quiz?.quiz_type ?? "daily")
  const [scheduled, setScheduled] = useState(quiz?.scheduled ?? "")
  const [loading, setLoading] = useState(false)
  const handleSave = async () => {
    setLoading(true)
    await onSave({ title: title.trim() || undefined, category: category.trim() || undefined, difficulty, scheduled: scheduled.trim() || undefined, quiz_type: quizType })
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="admin-card p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">Edit Quiz</div>
          <button type="button" onClick={onClose} className="rounded p-1.5 hover:bg-navy-700">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-navy-400 mb-1">Title</label>
            <input className="w-full admin-form-field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-navy-400 mb-1">Category</label>
            <input className="w-full admin-form-field" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-navy-400 mb-1">Difficulty</label>
            <select className="w-full admin-form-field" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-navy-400 mb-1">Scheduled</label>
            <input className="w-full admin-form-field" value={scheduled} onChange={(e) => setScheduled(e.target.value)} placeholder="e.g. Daily" />
          </div>
          <div>
            <label className="block text-sm text-navy-400 mb-1">Quiz Type</label>
            <select className="w-full admin-form-field" value={quizType} onChange={(e) => setQuizType(e.target.value as any)}>
              <option value="daily">Daily</option>
              <option value="tournament">Tournament (Secure)</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleSave} disabled={loading}>{loading ? "Saving…" : "Save"}</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Quiz Management Component ───────────────────────────────────────────────
export default function QuizManagement() {
  const [items, setItems] = useState<any[]>([])
  const [editQuiz, setEditQuiz] = useState<any | null>(null)
  const [aiTitle, setAiTitle] = useState("")
  const [aiTopic, setAiTopic] = useState("")
  const [aiCount, setAiCount] = useState<number>(5)
  const [aiDifficulties, setAiDifficulties] = useState<string[]>([])
  const [aiQuestionTypes, setAiQuestionTypes] = useState<string>("mixed")
  const ALL_LANGS = ["en", "hi", "te", "ta", "mr", "gu", "kn", "ml", "bn", "es"] as const
  const [aiLanguages, setAiLanguages] = useState<string[]>(["en"])
  const [aiMaxCount, setAiMaxCount] = useState<number>(20)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiAudience, setAiAudience] = useState<string>("general")
  const [aiDepartment, setAiDepartment] = useState<string | null>(null)
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null)
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; source?: string; error?: string; schema?: string } | null>(null)
  const [pdfUrlForQuiz, setPdfUrlForQuiz] = useState("")
  const [uploadingFromUrl, setUploadingFromUrl] = useState(false)
  const [targetType, setTargetType] = useState<"daily" | "tournament">("daily")
  const [triggeringAgent, setTriggeringAgent] = useState(false)

  const refreshQuizzes = useCallback(async () => {
    const r = await fetch("/api/quizzes", { cache: "no-store", credentials: "include" })
    const j = await r.json().catch(() => ({}))
    setItems(Array.isArray(j?.data) ? j.data : [])
  }, [])

  useEffect(() => {
    refreshQuizzes()
  }, [refreshQuizzes])

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data ?? {}
        const v = Number(d.aiQuestionLimit ?? 20)
        if (Number.isFinite(v) && v >= 1) setAiMaxCount(v)
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetch("/api/admin/quiz/ai-status", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => setAiConfigured(j?.configured ?? false))
      .catch(() => setAiConfigured(false))
  }, [])

  useEffect(() => {
    fetch("/api/admin/quiz/db-check", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((j) => setDbStatus({
        connected: j?.connected ?? false,
        source: j?.source,
        error: j?.error,
        schema: j?.schema
      }))
      .catch(() => setDbStatus({ connected: false, error: "Could not check DB" }))
  }, [])

  const uploadFromPdfUrl = async () => {
    const url = pdfUrlForQuiz.trim()
    if (!url) return
    setUploadingFromUrl(true)
    try {
      const res = await fetch("/api/quizzes/upload-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pdfUrl: url, title: "Quiz from PDF" })
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j?.ok) {
        await refreshQuizzes()
        setPdfUrlForQuiz("")
      } else {
        setAiError(j?.error || "Failed to extract from URL.")
      }
    } catch (e: any) {
      setAiError(e?.message || "Failed to extract from URL.")
    } finally {
      setUploadingFromUrl(false)
    }
  }

  const upload = async (file: File) => {
    const text = await file.text()
    let payload: any[] = []
    try {
      const json = JSON.parse(text)
      if (Array.isArray(json)) {
        const first = json[0]
        payload = first?.questions && Array.isArray(first.questions) ? json : [{ title: file.name, questions: json }]
      } else {
        payload = [{ title: json.title ?? file.name, questions: json.questions ?? [] }]
      }
    } catch {
      const { parseCSV, rowToQuestion } = await import("@/utils/csv")
      const rows = parseCSV(text)
      payload = [{
        title: file.name,
        questions: rows.map((r) => rowToQuestion(r)).filter((q) => q.question && q.options.length >= 2)
      }]
    }
    const res = await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ quizzes: payload.map(q => ({ ...q, quiz_type: targetType })) })
    })
    if (res.ok) await refreshQuizzes()
  }

  const importQuestionsToQuiz = async (quizId: string, file: File) => {
    const text = await file.text()
    let questions: any[] = []
    try {
      const json = JSON.parse(text)
      if (Array.isArray(json)) {
        const first = json[0]
        questions = first?.questions && Array.isArray(first.questions) ? first.questions : json
      } else {
        questions = json?.questions ?? (Array.isArray(json) ? json : [])
      }
    } catch {
      const { parseCSV, rowToQuestion } = await import("@/utils/csv")
      const rows = parseCSV(text)
      questions = rows.map((r) => rowToQuestion(r)).filter((q) => q.question && q.options.length >= 2)
    }
    const res = await fetch(`/api/quizzes/${quizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ questions })
    })
    if (res.ok) await refreshQuizzes()
  }

  const deleteQuiz = async (id: string) => {
    const res = await fetch(`/api/quizzes/${id}`, { method: "DELETE", credentials: "include" })
    if (res.ok) await refreshQuizzes()
  }

  const publishQuiz = async (id: string) => {
    const res = await fetch(`/api/quizzes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "Published" }) })
    if (res.ok) await refreshQuizzes()
  }

  const saveQuizEdit = async (updates: any) => {
    if (!editQuiz?.id) return
    const res = await fetch(`/api/quizzes/${editQuiz.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ...updates }) })
    if (res.ok) {
      await refreshQuizzes()
      setEditQuiz(null)
    }
  }

  const generateWithAi = async () => {
    const title = aiTitle.trim()
    if (!title) {
      setAiError("Quiz title is required.")
      return
    }
    setAiError("")
    setAiGenerating(true)
    try {
      const body: any = {
        count: Math.max(1, Math.min(aiMaxCount, aiCount || 1)),
        topic: aiTopic.trim(),
        languages: aiLanguages.length ? aiLanguages : ALL_LANGS,
        difficulties: aiDifficulties.length === 3 ? [] : aiDifficulties,
        questionTypes: aiQuestionTypes === "mixed" ? [] : [aiQuestionTypes],
        audienceSegment: aiAudience !== "general" ? aiAudience : undefined,
        department: aiDepartment || undefined
      }
      const res = await fetch("/api/admin/quiz/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        setAiError(String(data?.error || "Failed to generate questions."))
        return
      }

      if (Array.isArray(data.questionsMultiLang) && Array.isArray(data.languages) && data.languages.length > 0) {
        const saveRes = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title,
            questionsMultiLang: data.questionsMultiLang,
            languages: data.languages,
            quiz_type: targetType
          })
        })
        const saveData = await saveRes.json().catch(() => ({}))
        if (!saveRes.ok || !saveData?.ok) {
          setAiError(String(saveData?.error || "Failed to save quiz. Check DB connection."))
          return
        }
      } else if (Array.isArray(data.questions) && data.questions.length > 0) {
        const saveRes = await fetch("/api/quizzes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title,
            questions: data.questions,
            quiz_type: targetType
          })
        })
        const saveData = await saveRes.json().catch(() => ({}))
        if (!saveRes.ok || !saveData?.ok) {
          setAiError(String(saveData?.error || "Failed to save quiz. Check DB connection."))
          return
        }
      } else {
        setAiError("AI did not return any questions.")
        return
      }

      await refreshQuizzes()
      setAiError("")
    } catch (err: any) {
      setAiError(String(err?.message || "Unexpected error while generating quiz."))
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-xl font-semibold text-white">Quiz Management</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="admin-btn admin-btn-primary cursor-pointer inline-block">
            <input hidden type="file" accept=".json,.csv" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            + Upload JSON / CSV
          </label>
          <span className="text-navy-500 text-xs">or paste PDF URL:</span>
          <input
            type="url"
            placeholder="https://...supabase.../uploads/..."
            value={pdfUrlForQuiz}
            onChange={(e) => setPdfUrlForQuiz(e.target.value)}
            className="w-64 admin-form-field text-xs py-2"
          />
          <button onClick={uploadFromPdfUrl} disabled={!pdfUrlForQuiz.trim() || uploadingFromUrl} className="admin-btn admin-btn-ghost text-xs">
            {uploadingFromUrl ? "Extracting…" : "Extract from URL"}
          </button>
        </div>
      </div>

      {/* AI Autonomous Generation - Mission Critical Feature */}
      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6 relative overflow-hidden group mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform duration-500">🤖</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Daily Quiz Automation</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-black font-black uppercase tracking-widest">Active</span>
              </div>
              <p className="text-xs text-white/50 mt-1 leading-relaxed max-w-lg">
                Enable zero-intervention quiz generation. The AI Agent will automatically generate and publish a new quiz every day at 12:00 AM using your preferred topics.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <button 
                disabled={triggeringAgent}
                onClick={async () => {
                   if (!confirm("Trigger AI Agent to generate/overwrite daily quiz now?")) return;
                  setTriggeringAgent(true);
                  try {
                    const res = await fetch("/api/admin/ai/auto-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ force: true }) });
                    const data = await res.json();
                    if (data.ok) { alert("AI Agent triggered: Today's quiz generated successfully!"); try{ refreshQuizzes(); }catch(e){} }
                    else alert("Agent Error: " + data.error);
                  } finally {
                    setTriggeringAgent(false);
                  }
                }}
                className={`flex-1 sm:flex-none h-11 px-6 rounded-xl bg-black text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-black transition-all active:scale-95 shadow-xl shadow-emerald-500/10 disabled:opacity-50 group relative overflow-hidden`}
             >
                <span className="relative z-10">{triggeringAgent ? "⚙️ Synchronizing..." : "Trigger AI Agent"}</span>
                {!triggeringAgent && <div className="absolute inset-x-0 bottom-0 h-[1px] bg-emerald-500/50 blur-[2px] animate-pulse" />}
             </button>
             <button className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">
               Parameters
             </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-navy-600/80 bg-gradient-to-b from-navy-800/50 to-navy-900/80 p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">AI Question Generator</h3>
            <p className="mt-0.5 text-sm text-navy-400">Generate questions based on your choices. Output matches selections exactly.</p>
          </div>
          <div className="text-xs text-navy-500 tabular-nums">
            ~{(Math.max(1, Math.min(aiMaxCount, aiCount || 1)) * 180 + 400).toLocaleString()} tokens/request
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-b border-navy-700 pb-4 mb-4">
          <div>
            <label className="block text-[10px] uppercase font-bold text-navy-400 mb-1">Target Quiz Type</label>
            <div className="flex bg-navy-900/50 p-1 rounded-xl gap-1">
              {(["daily", "tournament"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTargetType(t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${targetType === t ? "bg-primary text-black" : "text-navy-400 hover:text-white"}`}
                >
                  {t === "daily" ? "📅 Daily Quiz" : "🏆 Tournament"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-navy-500 max-w-[240px]">
            {targetType === "tournament" ? "Tournament quizzes are SECURE and only show to paid/enrolled users. They will NOT appear for free users in the Daily section." : "Daily quizzes are PUBLIC and will show in the regular 'New Quiz' rotation for everyone."}
          </p>
        </div>

        {aiConfigured === false && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            Add <code className="px-1.5 py-0.5 rounded bg-navy-800 font-mono text-xs">NVIDIA_API_KEY</code> to <code className="px-1.5 py-0.5 rounded bg-navy-800">.env.local</code>. Get a key at <a href="https://build.nvidia.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-300">build.nvidia.com</a>.
          </div>
        )}

        {dbStatus && !dbStatus.connected && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm space-y-2">
            <div className="font-semibold text-white">Database not connected</div>
            <p className="text-red-300">{dbStatus.error || "Quizzes will not be saved. Configure Supabase or run the schema below."}</p>
            {dbStatus.schema && (
              <details className="mt-2 text-white">
                <summary className="cursor-pointer text-red-300 hover:text-red-200">Create quizzes table (Supabase SQL Editor)</summary>
                <pre className="mt-2 p-3 rounded-lg bg-navy-900/80 text-xs overflow-x-auto max-h-40 overflow-y-auto">{dbStatus.schema}</pre>
              </details>
            )}
          </div>
        )}

        {dbStatus?.connected && (
          <div className="mt-2 text-xs text-emerald-400/80 font-medium tracking-wide items-center gap-1.5 flex">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
             DB: {dbStatus.source || "connected"}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-navy-300 uppercase tracking-wider">Quiz title</label>
            <input
              className="w-full rounded-xl bg-navy-700/80 border border-navy-600 px-4 py-2.5 text-white placeholder-navy-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="e.g. General Knowledge Quiz"
              value={aiTitle}
              onChange={(e) => setAiTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-navy-300 uppercase tracking-wider">Topic (optional)</label>
            <input
              className="w-full rounded-xl bg-navy-700/80 border border-navy-600 px-4 py-2.5 text-white placeholder-navy-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="e.g. Indian history, Math, Science"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-navy-300 uppercase tracking-wider">Number of questions</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={aiMaxCount}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value) || 1)}
                className="w-24 rounded-xl bg-navy-700/80 border border-navy-600 px-4 py-2.5 text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <span className="text-xs text-navy-500">max {aiMaxCount}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 border-t border-navy-700 pt-6">
          <div>
            <label className="block text-xs font-medium text-navy-300 uppercase tracking-wider mb-2">Difficulty</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "Easy", label: "Easy" },
                { id: "Medium", label: "Medium" },
                { id: "Hard", label: "Hard" }
              ].map((opt) => {
                const active = aiDifficulties.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setAiDifficulties((prev) => {
                        const has = prev.includes(opt.id)
                        if (has) {
                          const next = prev.filter((x) => x !== opt.id)
                          return next.length ? next : ["Easy", "Medium", "Hard"]
                        }
                        return [...prev, opt.id]
                      })
                    }}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${active ? "bg-primary text-black shadow-lg shadow-primary/20" : "bg-navy-700/80 text-navy-300 hover:bg-navy-600 hover:text-white"
                      }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-300 uppercase tracking-wider mb-2">Question type</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "mixed", label: "Mixed" },
                { id: "logical", label: "Logical" },
                { id: "aptitude", label: "Aptitude" },
                { id: "general_knowledge", label: "G.K." },
                { id: "current_affairs", label: "Current affairs" },
                { id: "verbal", label: "Verbal" },
                { id: "quantitative", label: "Quantitative" }
              ].map((opt) => {
                const active = aiQuestionTypes === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAiQuestionTypes(opt.id)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${active ? "bg-primary text-black shadow-lg shadow-primary/20" : "bg-navy-700/80 text-navy-300 hover:bg-navy-600 hover:text-white"
                      }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-300 uppercase tracking-wider mb-2">Languages</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAiLanguages(aiLanguages.length === ALL_LANGS.length ? ["en"] : [...ALL_LANGS])}
                className="rounded-lg px-3.5 py-2 text-sm font-medium transition-all bg-navy-600/80 text-navy-300 hover:bg-navy-600 hover:text-white border border-navy-500/50"
              >
                {aiLanguages.length === ALL_LANGS.length ? "English only" : "All languages"}
              </button>
              {[
                { id: "en", label: "🇺🇸 English" },
                { id: "hi", label: "🇮🇳 Hindi" },
                { id: "te", label: "🇮🇳 Telugu" },
                { id: "ta", label: "🇮🇳 Tamil" },
                { id: "mr", label: "🇮🇳 Marathi" },
                { id: "gu", label: "🇮🇳 Gujarati" },
                { id: "kn", label: "🇮🇳 Kannada" },
                { id: "ml", label: "🇮🇳 Malayalam" },
                { id: "bn", label: "🇮🇳 Bengali" },
                { id: "es", label: "🇪🇸 Spanish" }
              ].map((opt) => {
                const active = aiLanguages.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setAiLanguages((prev) => {
                        const has = prev.includes(opt.id)
                        if (has) {
                          const next = prev.filter((x) => x !== opt.id)
                          return next.length ? next : ["en"]
                        }
                        return [...prev, opt.id]
                      })
                    }}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${active ? "bg-primary text-black shadow-lg shadow-primary/20" : "bg-navy-700/80 text-navy-300 hover:bg-navy-600 hover:text-white"
                      }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
            {aiLanguages.length >= 4 && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300">
                <span className="text-amber-400 shrink-0 mt-0.5">⚠️</span>
                <span>
                  <strong>Note:</strong> With {aiLanguages.length} languages selected, max questions is automatically reduced to{" "}
                  <strong>{aiLanguages.length >= 6 ? 3 : 5}</strong> to stay within AI token limits.
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-300 uppercase tracking-wider mb-2">Audience</label>
            {(() => {
              const audienceOpts: { id: string; label: string; departments?: { id: string; label: string }[] }[] = [
                { id: "general", label: "General" },
                { id: "btech", label: "B.Tech", departments: [{ id: "datascience", label: "Data Science" }, { id: "aiml", label: "AI & ML" }, { id: "cybersecurity", label: "Cybersecurity" }, { id: "cse", label: "CSE" }, { id: "it", label: "IT" }, { id: "mechanical", label: "Mechanical" }, { id: "civil", label: "Civil" }, { id: "eee", label: "EEE" }] },
                { id: "bipc", label: "BiPC", departments: [{ id: "mbbs", label: "MBBS" }, { id: "pharmacy", label: "Pharmacy" }, { id: "nursing", label: "Nursing" }, { id: "physiotherapy", label: "Physiotherapy" }] },
                { id: "pg", label: "PG", departments: [{ id: "mba", label: "MBA" }, { id: "mtech", label: "M.Tech" }, { id: "msc", label: "M.Sc" }] },
                { id: "business", label: "Business" },
                { id: "bba", label: "BBA" },
                { id: "digital_forensic", label: "Digital Forensic" },
                { id: "elite_sciences", label: "Elite Sciences (Physiotherapy, Anesthesia)" },
                { id: "ece", label: "ECE" },
                { id: "aeronautical", label: "Aeronautical" }
              ]
              const selectedOpt = audienceOpts.find((o) => o.id === aiAudience)
              const depts = selectedOpt?.departments
              return (
                <>
                  <div className="flex flex-wrap gap-2">
                    {audienceOpts.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setAiAudience(opt.id)
                          setAiDepartment(null)
                        }}
                        className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${aiAudience === opt.id ? "bg-primary text-black shadow-lg shadow-primary/20" : "bg-navy-700/80 text-navy-300 hover:bg-navy-600 hover:text-white"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {depts?.length ? (
                    <div className="mt-3 pl-0.5">
                      <span className="text-[11px] text-navy-400 uppercase tracking-wider">{selectedOpt?.label} department / stream</span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {depts.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setAiDepartment(aiDepartment === d.id ? null : d.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${aiDepartment === d.id ? "bg-primary/20 border border-primary/50 text-primary" : "bg-navy-700/60 text-navy-400 hover:bg-navy-600 hover:text-white border border-transparent"}`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )
            })()}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-xl bg-primary px-6 py-2.5 font-semibold text-black shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            onClick={generateWithAi}
            disabled={aiGenerating || aiConfigured === false}
          >
            {aiGenerating ? "Generating Quiz…" : "⚡ Generate & Save Quiz"}
          </button>
          {aiError && <div className="text-red-400 text-sm font-medium animate-pulse">{aiError}</div>}
        </div>
      </div>

      {items.length ? (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <QuizCard
              key={i.id}
              id={i.id}
              title={i.title}
              category={i.category || "General"}
              difficulty={i.difficulty || "Medium"}
              questions={i.questions?.length ?? 0}
              scheduled={i.scheduled || "Daily"}
              status={i.status || "Draft"}
              onDelete={() => deleteQuiz(i.id)}
              onImportQuestions={importQuestionsToQuiz}
              onPublish={() => publishQuiz(i.id)}
              onEdit={() => setEditQuiz(i)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 text-center py-12 rounded-2xl border border-navy-700 bg-navy-800/30">
          <div className="text-4xl mb-4">📭</div>
          <div className="text-navy-300 font-medium tracking-wide">No quizzes created yet. Use the AI generator above or upload a CSV.</div>
        </div>
      )}

      {editQuiz && (
        <QuizEditModal
          quiz={editQuiz}
          onClose={() => setEditQuiz(null)}
          onSave={saveQuizEdit}
        />
      )}
    </div>
  )
}

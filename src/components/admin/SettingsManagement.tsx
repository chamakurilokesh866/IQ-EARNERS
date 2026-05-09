"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import { isValidUrlOrPath } from "@/lib/inputValidation"

const TargetAudienceCard = dynamic(() => import("../TargetAudienceCard"), { ssr: false })

function useUnsavedChangesPrompt(hasUnsaved: boolean) {
  useEffect(() => {
    if (!hasUnsaved) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [hasUnsaved])
}

function SettingsStatusToast({ type, message }: { type: "success" | "error"; message: string }) {
  const cls =
    type === "success"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : "border-red-500/40 bg-red-500/10 text-red-300"
  return <p className={`mt-2 rounded-lg border px-3 py-2 text-xs font-semibold ${cls}`}>{message}</p>
}

export function VipModalSettingsCard() {
  const [enabled, setEnabled] = useState(false)
  const [title, setTitle] = useState("")
  const [image, setImage] = useState("")
  const [buttonText, setButtonText] = useState("")
  const [link, setLink] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [initialState, setInitialState] = useState("")

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!j) return
        const d = j?.data?.vipModal ?? {}
        setEnabled(!!d.enabled)
        setTitle(d.title ?? "")
        setImage(d.image ?? "")
        setButtonText(d.buttonText ?? "")
        setLink(d.link ?? "")
        setInitialState(JSON.stringify({
          enabled: !!d.enabled,
          title: d.title ?? "",
          image: d.image ?? "",
          buttonText: d.buttonText ?? "",
          link: d.link ?? "",
        }))
      })
      .catch(() => { })
  }, [])

  const currentState = JSON.stringify({
    enabled,
    title: title.trim(),
    image: image.trim(),
    buttonText: buttonText.trim(),
    link: link.trim(),
  })
  const hasUnsaved = !!initialState && currentState !== initialState
  useUnsavedChangesPrompt(hasUnsaved)

  const save = async () => {
    if (!isValidUrlOrPath(link)) {
      setError("Enter a valid https:// URL or relative path like /tournaments.")
      return
    }
    setLoading(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vipModal: { enabled, title: title.trim(), image, buttonText: buttonText.trim(), link: link.trim() }
        })
      })
      if (res.ok) {
        setSaved(true)
        setInitialState(currentState)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const j = await res.json().catch(() => ({}))
        setError(j?.error ?? "Save failed")
      }
    } catch {
      setError("Save failed")
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch("/api/admin/settings/upload-vip-promo", { method: "POST", credentials: "include", body: fd })
      const j = await res.json().catch(() => ({}))
      if (j?.ok && j?.imageUrl) {
        setImage(j.imageUrl)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setError(j?.error ?? "Upload failed")
      }
    } catch (err: any) {
      setError(err.message ?? "Upload failed")
    } finally {
      setLoading(false)
      e.target.value = ""
    }
  }

  return (
    <div className="admin-card p-6 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold text-lg">VIP Modal Popup</div>
          <p className="text-sm text-navy-400">This popup appears on homepage after ~3 seconds for eligible users.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative w-14 h-8 rounded-full transition-colors duration-150 ${enabled ? "bg-primary" : "bg-navy-600"}`}
          >
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all duration-150 ease-out ${enabled ? "left-7" : "left-1"}`} />
          </button>
          <span className="text-sm font-medium">{enabled ? "ON" : "OFF"}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-navy-300 block mb-1">Modal Title</label>
            <input type="text" placeholder="Enter popup title" value={title} onChange={(e) => setTitle(e.target.value)} className="input-glass rounded-lg w-full px-4 py-2" />
          </div>
          <div>
            <label className="text-sm text-navy-300 block mb-1">Button Text</label>
            <input type="text" placeholder="Enter button text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} className="input-glass rounded-lg w-full px-4 py-2 text-white" />
          </div>
        </div>
        <div>
          <label className="text-sm text-navy-300 block mb-1">Target Link (URL or relative path)</label>
          <input type="text" placeholder="https://example.com/offer or /tournaments" value={link} onChange={(e) => setLink(e.target.value)} className="input-glass rounded-lg w-full px-4 py-2" />
        </div>

        <div>
          <label className="text-sm text-navy-300 block mb-2">Promotional Image</label>
          {image ? (
            <div className="flex items-start gap-4 p-4 rounded-xl bg-navy-800/50 border border-navy-600">
              <img src={image} alt="VIP Promo" className="w-32 h-32 object-cover rounded-lg" />
              <div className="flex flex-col gap-2">
                <label className="admin-btn admin-btn-ghost cursor-pointer text-xs">
                  Change Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={loading} />
                </label>
                <button type="button" className="admin-btn admin-btn-danger text-xs" onClick={() => setImage("")}>Remove</button>
              </div>
            </div>
          ) : (
            <label className="block p-8 rounded-xl border-2 border-dashed border-navy-600 hover:border-primary/50 transition-colors cursor-pointer text-center">
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={loading} />
              <span className="text-sm text-navy-400">Click to upload promotional image</span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button className="admin-btn admin-btn-primary" onClick={save} disabled={loading}>{loading ? "Saving…" : "Save Settings"}</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPreviewOpen((v) => !v)}>
            {previewOpen ? "Hide Preview" : "Preview Modal"}
          </button>
          {hasUnsaved && <span className="text-xs text-amber-300">Unsaved changes</span>}
        </div>
        {saved && <SettingsStatusToast type="success" message="Settings saved successfully." />}
        {error && <SettingsStatusToast type="error" message={error} />}
        {previewOpen && (
          <div className="mt-2 rounded-xl border border-navy-600 bg-navy-900/60 p-4">
            <div className="text-[10px] text-navy-400 uppercase font-bold tracking-widest mb-2">Preview</div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <div className="font-semibold text-white">{title.trim() || "Your popup title appears here"}</div>
              {!!image && <img src={image} alt="VIP promo preview" className="mt-3 max-h-44 w-full object-cover rounded" />}
              <button type="button" className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-navy-950">
                {buttonText.trim() || "Action button"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function TimePerQuestionCard() {
  const [timePerQuestion, setTimePerQuestion] = useState<number>(30)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!j) return
        const v = Number(j?.data?.timePerQuestion ?? 30)
        setTimePerQuestion(Number.isFinite(v) ? v : 30)
      })
      .catch(() => { })
  }, [])
  const save = async () => {
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ timePerQuestion: Math.max(5, Math.min(120, timePerQuestion)) })
      })
      if (res.ok) setSaved(true)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="admin-card p-6">
      <div className="font-semibold">Quiz Timer</div>
      <p className="mt-1 text-sm text-navy-400">Seconds per question. Timer starts only when user clicks Start. Leaderboard uses milliseconds for tiebreak when times are equal.</p>
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm text-navy-300">Seconds per question</label>
        <input type="number" min={5} max={120} value={timePerQuestion} onChange={(e) => setTimePerQuestion(Number(e.target.value) || 30)} className="input-glass rounded-lg w-24 px-4 py-2" />
        <button className="admin-btn admin-btn-primary" onClick={save} disabled={loading}>{loading ? "Saving…" : "Save"}</button>
        {saved && <span className="text-sm text-success">Saved</span>}
      </div>
    </div>
  )
}

export function LiveQuizTimeCard() {
  const [liveQuizHour, setLiveQuizHour] = useState(20)
  const [liveQuizMinute, setLiveQuizMinute] = useState(0)
  const [timeEnabled, setTimeEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!j) return
        const h = Number(j?.data?.liveQuizHour ?? 20)
        const m = Number(j?.data?.liveQuizMinute ?? 0)
        if (Number.isFinite(h) && h >= 0 && h <= 23) setLiveQuizHour(h)
        if (Number.isFinite(m) && m >= 0 && m <= 59) setLiveQuizMinute(m)
        setTimeEnabled(j?.data?.liveMegaTimeEnabled !== false)
      })
      .catch(() => { })
  }, [])
  const save = async () => {
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ liveQuizHour, liveQuizMinute, liveMegaTimeEnabled: timeEnabled })
      })
      if (res.ok) setSaved(true)
    } finally {
      setLoading(false)
    }
  }
  const displayTime = `${String(liveQuizHour).padStart(2, "0")}:${String(liveQuizMinute).padStart(2, "0")}`
  return (
    <div className="admin-card p-6">
      <div className="font-semibold">Live Mega Tournament — Daily Start Time</div>
      <p className="mt-1 text-sm text-navy-400">When the Live Mega Tournament countdown targets. Users see &quot;LIVE AT {displayTime}&quot;. Default: 8 PM (20:00).</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={timeEnabled} onChange={(e) => setTimeEnabled(e.target.checked)} className="rounded border-navy-600 bg-navy-700 text-primary focus:ring-primary" />
          <span className="text-sm text-navy-300">Show countdown & time</span>
        </label>
        {timeEnabled && (
          <>
            <label className="text-sm text-navy-300">Hour (0–23)</label>
            <input type="number" min={0} max={23} value={liveQuizHour} onChange={(e) => setLiveQuizHour(Math.max(0, Math.min(23, Number(e.target.value) || 0)))} className="input-glass rounded-lg w-20 px-3 py-2" />
            <label className="text-sm text-navy-300">Minute (0–59)</label>
            <input type="number" min={0} max={59} value={liveQuizMinute} onChange={(e) => setLiveQuizMinute(Math.max(0, Math.min(59, Number(e.target.value) || 0)))} className="input-glass rounded-lg w-20 px-3 py-2" />
          </>
        )}
        <button className="admin-btn admin-btn-primary" onClick={save} disabled={loading}>{loading ? "Saving…" : "Save"}</button>
        {saved && <span className="text-sm text-success">Saved</span>}
      </div>
      <p className="mt-2 text-xs text-navy-500">When off, the banner hides &quot;LIVE AT&quot; and countdown. Example: 20 = 8 PM.</p>
    </div>
  )
}

export function AiQuestionLimitCard() {
  const [aiQuestionLimit, setAiQuestionLimit] = useState<number>(20)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!j) return
        const v = Number(j?.data?.aiQuestionLimit ?? 20)
        setAiQuestionLimit(Number.isFinite(v) && v >= 1 ? v : 20)
      })
      .catch(() => { })
  }, [])
  const save = async () => {
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ aiQuestionLimit: Math.max(1, Math.min(100, aiQuestionLimit)) })
      })
      if (res.ok) setSaved(true)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="admin-card p-6">
      <div className="font-semibold">AI Question Limit</div>
      <p className="mt-1 text-sm text-navy-400">Maximum number of questions the admin can generate in one go via &quot;Generate with AI&quot; in Quizzes. Keeps cost and load under control.</p>
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm text-navy-300">Max questions per generation</label>
        <input type="number" min={1} max={100} value={aiQuestionLimit} onChange={(e) => setAiQuestionLimit(Number(e.target.value) || 20)} className="input-glass rounded-lg w-24 px-4 py-2" />
        <button className="admin-btn admin-btn-primary" onClick={save} disabled={loading}>{loading ? "Saving…" : "Save"}</button>
        {saved && <span className="text-sm text-success">Saved</span>}
      </div>
    </div>
  )
}

export function MockExamSettingsCard() {
  const [enabled, setEnabled] = useState(false)
  const [durationMin, setDurationMin] = useState(180)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [appendMode, setAppendMode] = useState(false)
  const [quickMode, setQuickMode] = useState(true)
  const [pdfTargetCourse, setPdfTargetCourse] = useState<"main" | "mpc" | "bipc" | "cert">("main")
  const [pdfUrl, setPdfUrl] = useState("")
  const [aiTopic, setAiTopic] = useState("")
  const [aiCount, setAiCount] = useState(100)
  const [aiExamType, setAiExamType] = useState<"ts" | "ap" | "emcert" | "apcert">("ts")
  const [aiAudience, setAiAudience] = useState<"mpc" | "bipc" | "cert">("mpc")
  const [aiAppend, setAiAppend] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [mockExamAiConfigured, setMockExamAiConfigured] = useState<boolean | null>(null)
  const [deleteCourse, setDeleteCourse] = useState<"main" | "mpc" | "bipc" | "cert" | "all">("main")

  useEffect(() => {
    fetch("/api/admin/quiz/ai-status", { cache: "no-store", credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => setMockExamAiConfigured(j?.mockExamConfigured ?? false))
      .catch(() => setMockExamAiConfigured(false))
  }, [])

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => { if (!j) return
        if (j?.ok && j.data) {
          setEnabled(!!j.data.tsEamcetMockExamEnabled)
          setDurationMin(j.data.tsEamcetMockExamDurationMin ?? 180)
        }
      })
      .catch(() => { })
  }, [])

  const handleSaveSettings = async () => {
    setLoading(true)
    setMessage("")
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tsEamcetMockExamEnabled: enabled,
          tsEamcetMockExamDurationMin: Number(durationMin)
        })
      })
      const j = await res.json()
      if (j.ok) setMessage("Settings saved!")
      else setMessage(j.error || "Failed to save settings.")
    } catch {
      setMessage("Failed to save settings.")
    }
    setLoading(false)
  }

  const handleUploadPdf = async () => {
    const urlTrimmed = pdfUrl.trim()
    if (!file && !urlTrimmed) {
      setMessage("Please select a PDF file or paste a PDF URL.")
      return
    }
    setLoading(true)
    setMessage("")
    let targetUrl = ""
    try {
      if (urlTrimmed) {
        targetUrl = urlTrimmed
      } else if (file) {
        const { createClient } = await import("@supabase/supabase-js")
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
        const supabase = createClient(supabaseUrl, supabaseKey)
        const fileName = `temp-pdfs/mock-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, "_")}`
        const { error: uploadErr } = await supabase.storage.from("uploads").upload(fileName, file)
        if (uploadErr) throw new Error(uploadErr.message)
        const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(fileName)
        targetUrl = publicData.publicUrl
      }
      const res = await fetch("/api/admin/mock-exam-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: targetUrl, merge: appendMode, maxChunks: quickMode ? 1 : 999, targetCourse: pdfTargetCourse }),
        credentials: "include"
      })
      const j = await res.json()
      if (res.ok && j.ok) setMessage(`Success! Extracted ${j.count} questions.`)
      else setMessage(j.error || "Failed to parse.")
    } catch (e: any) {
      setMessage(e.message || "Upload failed.")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateWithAi = async () => {
    setAiGenerating(true)
    setMessage("")
    try {
      const res = await fetch("/api/admin/mock-exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: aiTopic || undefined, count: aiCount, audience: aiExamType === "emcert" || aiExamType === "apcert" ? "cert" : aiAudience, examType: aiExamType, merge: aiAppend })
      })
      const j = await res.json()
      if (res.ok && j.ok) setMessage(`Generated ${j.count} questions.`)
      else setMessage(j.error || "AI failed.")
    } finally {
      setAiGenerating(false)
    }
  }

  const handleDeleteMockExam = async () => {
    if (!confirm("Are you sure?")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/mock-exam-upload?course=${deleteCourse}`, { method: "DELETE", credentials: "include" })
      if (res.ok) setMessage("Deleted successfully.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold text-lg flex items-center gap-2"><span>🎓</span> Mock Exam</div>
          <div className="text-sm text-navy-400 mt-1">Toggle the specialized TS/AP Mock Exam feature.</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <div className="w-11 h-6 bg-navy-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>
      <div className="bg-navy-800/50 p-4 rounded-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-navy-200 mb-2 uppercase tracking-wide">Exam Duration (Minutes)</label>
          <input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className="input-glass rounded-lg w-full max-w-[200px]" />
        </div>
        <div className="border border-dashed border-navy-500 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-navy-100 text-center">Upload PDF</p>
          <div>
            <label className="block text-xs font-semibold text-navy-300 mb-1 uppercase tracking-wide">Target Course</label>
            <select
              value={pdfTargetCourse}
              onChange={(e) => setPdfTargetCourse(e.target.value as "main" | "mpc" | "bipc" | "cert")}
              className="input-glass rounded-lg w-full"
            >
              <option value="main">General Mock</option>
              <option value="mpc">MPC (Engineering)</option>
              <option value="bipc">BiPC (Medical)</option>
              <option value="cert">Digital Certification (EMCERT/APCERT)</option>
            </select>
          </div>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs w-full max-w-xs mx-auto" />
          <input
            type="url"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            className="input-glass rounded-lg w-full"
            placeholder="or paste PDF URL (https://...)"
          />
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-2 text-navy-300">
              <input type="checkbox" checked={appendMode} onChange={(e) => setAppendMode(e.target.checked)} />
              Merge with existing questions
            </label>
            <label className="inline-flex items-center gap-2 text-navy-300">
              <input type="checkbox" checked={quickMode} onChange={(e) => setQuickMode(e.target.checked)} />
              Quick parse mode
            </label>
          </div>
          <div className="text-center">
            <button onClick={handleUploadPdf} disabled={loading} className="admin-btn admin-btn-primary mx-auto">Upload & Extract</button>
          </div>
        </div>
        <div className="border border-navy-600 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-navy-100">Generate with AI</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy-300 mb-1 uppercase tracking-wide">Exam Type</label>
              <select
                value={aiExamType}
                onChange={(e) => setAiExamType(e.target.value as "ts" | "ap" | "emcert" | "apcert")}
                className="input-glass rounded-lg w-full"
              >
                <option value="ts">TS EAMCET</option>
                <option value="ap">AP EAPCET</option>
                <option value="emcert">EMCERT</option>
                <option value="apcert">APCERT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-300 mb-1 uppercase tracking-wide">Question Count</label>
              <input
                type="number"
                min={10}
                max={200}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value) || 100)}
                className="input-glass rounded-lg w-full"
              />
            </div>
          </div>
          <input
            type="text"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            className="input-glass rounded-lg w-full"
            placeholder="Optional topic focus (e.g. Algebra, ICT, Biology)"
          />
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-2 text-navy-300">
              <input type="checkbox" checked={aiAppend} onChange={(e) => setAiAppend(e.target.checked)} />
              Merge with existing course
            </label>
            {mockExamAiConfigured === false && <span className="text-amber-400 font-bold">MOCK_EXAM_AI_API_KEY not configured</span>}
          </div>
          <button onClick={handleGenerateWithAi} disabled={aiGenerating || loading || mockExamAiConfigured === false} className="admin-btn admin-btn-primary">
            {aiGenerating ? "Generating..." : "Generate with AI"}
          </button>
        </div>
        <div className="border border-navy-700 rounded-xl p-4">
          <label className="block text-xs font-semibold text-navy-300 mb-2 uppercase tracking-wide">Delete Course Data</label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={deleteCourse}
              onChange={(e) => setDeleteCourse(e.target.value as "main" | "mpc" | "bipc" | "cert" | "all")}
              className="input-glass rounded-lg"
            >
              <option value="main">General Mock</option>
              <option value="mpc">MPC (Engineering)</option>
              <option value="bipc">BiPC (Medical)</option>
              <option value="cert">Digital Certification (EMCERT/APCERT)</option>
              <option value="all">All Courses</option>
            </select>
            <button onClick={handleDeleteMockExam} disabled={loading} className="admin-btn admin-btn-danger">Delete from DB</button>
          </div>
        </div>
        <div className="pt-2 flex flex-col md:flex-row items-center gap-3">
          <button onClick={handleSaveSettings} disabled={loading} className="admin-btn admin-btn-primary">Save Settings</button>
        </div>
        {message && <div className="mt-3 text-sm text-emerald-400 font-bold">{message}</div>}
      </div>
    </div>
  )
}

export function SeoSettingsCard() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialState, setInitialState] = useState("")
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" }).then(r => r.ok ? r.json() : null).then(j => { if (!j) return
      setTitle(j?.data?.seoTitle ?? "")
      setDescription(j?.data?.seoDescription ?? "")
      setInitialState(JSON.stringify({ title: j?.data?.seoTitle ?? "", description: j?.data?.seoDescription ?? "" }))
    }).catch(() => {})
  }, [])
  const currentState = JSON.stringify({ title, description })
  const hasUnsaved = !!initialState && currentState !== initialState
  useUnsavedChangesPrompt(hasUnsaved)
  const save = async () => {
    setLoading(true)
    setError(null)
    const normalizedTitle = title.trim().slice(0, 70)
    const normalizedDescription = description.trim().slice(0, 180)
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ seoTitle: normalizedTitle, seoDescription: normalizedDescription }) })
    if (res.ok) {
      setSaved(true)
      setInitialState(JSON.stringify({ title: normalizedTitle, description: normalizedDescription }))
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError("Failed to save SEO settings.")
    }
    setLoading(false)
  }
  return (
    <div className="admin-card p-6">
      <div className="font-semibold">SEO Settings</div>
      <div className="mt-4 space-y-3">
        <input className="input-glass w-full rounded-lg px-4 py-2" placeholder="Meta title for Google search" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="input-glass w-full rounded-lg px-4 py-2" placeholder="Meta description shown in search results" value={description} onChange={e => setDescription(e.target.value)} />
        <div className="rounded-xl border border-navy-600 bg-navy-900/60 p-4">
          <div className="text-[10px] text-navy-400 uppercase font-bold tracking-widest mb-2">Google preview</div>
          <div className="text-blue-300 text-base leading-tight">{title.trim() || "Your SEO title appears here"}</div>
          <div className="text-emerald-300/80 text-xs mt-1">https://www.iqearners.online</div>
          <div className="text-sm text-white/70 mt-1">{description.trim() || "Your meta description appears here."}</div>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={save} disabled={loading}>{loading ? "Saving…" : "Save SEO"}</button>
        {saved && <SettingsStatusToast type="success" message="Settings saved successfully." />}
        {error && <SettingsStatusToast type="error" message={error} />}
        {hasUnsaved && <p className="text-xs text-amber-300">Unsaved changes</p>}
      </div>
    </div>
  )
}

export function DemoQuestionsToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(j => { if (j) setEnabled(!!j?.data?.demoQuestionsEnabled) }).catch(() => {})
  }, [])
  const save = async () => {
    setLoading(true); setSaved(false)
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ demoQuestionsEnabled: !enabled }) })
    if (res.ok) { setEnabled(!enabled); setSaved(true); setTimeout(() => setSaved(false), 2000) }
    setLoading(false)
  }
  return (
    <div className="admin-card p-6 flex items-center justify-between">
      <div><div className="font-semibold text-lg">Demo / Mock Questions</div><p className="text-sm text-navy-400">If enabled, the quiz will show predefined questions when generator fails or as fallback.</p></div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={loading} className={`relative w-14 h-8 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-navy-600"}`}>
          <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${enabled ? "left-7" : "left-1"}`} />
        </button>
        {saved && <span className="text-xs text-success">✓</span>}
      </div>
    </div>
  )
}

export function MaintenanceModeToggle() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(j => { if (j) setEnabled(!!j?.data?.maintenanceMode) }).catch(() => {})
  }, [])
  const save = async () => {
    const next = !enabled
    if (next && !confirm("Enabling maintenance will block all users except admins. Continue?")) return
    setLoading(true)
    setMessage(null)
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ maintenanceMode: next }) })
    if (res.ok) {
      setEnabled(next)
      setMessage("Settings saved successfully.")
    } else {
      setMessage("Failed to update maintenance mode.")
    }
    setLoading(false)
  }
  return (
    <div className="admin-card p-6 border-red-500/20 flex items-center justify-between">
      <div>
        <div className="font-semibold text-lg text-primary">Maintenance Mode</div>
        <p className="text-sm text-navy-400">Redirects all non-admin users to a maintenance page. Used for DB migrations or major updates.</p>
        <p className="text-xs text-amber-300 mt-1">⚠ Enabling will block all users except admins.</p>
        {message && <SettingsStatusToast type={message.includes("Failed") ? "error" : "success"} message={message} />}
      </div>
      <button onClick={save} disabled={loading} className={`relative w-14 h-8 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-navy-600"}`}>
        <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${enabled ? "left-7" : "left-1"}`} />
      </button>
    </div>
  )
}

export function SocialMediaCard() {
  const [links, setLinks] = useState({ instagram: "", facebook: "", twitter: "", telegram: "" })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialState, setInitialState] = useState("")
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(j => { if (j) setLinks(j?.data?.socialLinks ?? { instagram: "", facebook: "", twitter: "", telegram: "" }) }).catch(() => {})
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        const data = j?.data?.socialLinks ?? { instagram: "", facebook: "", twitter: "", telegram: "" }
        setInitialState(JSON.stringify(data))
      })
      .catch(() => {})
  }, [])
  const hasUnsaved = !!initialState && JSON.stringify(links) !== initialState
  useUnsavedChangesPrompt(hasUnsaved)
  const save = async () => {
    setLoading(true); setSaved(false)
    setError(null)
    const entries = Object.entries(links) as Array<[keyof typeof links, string]>
    for (const [k, v] of entries) {
      if (v.trim() && !isValidUrlOrPath(v)) {
        setError(`${k} must be a valid https:// URL.`)
        setLoading(false)
        return
      }
    }
    const cleaned = Object.fromEntries(entries.map(([k, v]) => [k, v.trim()]))
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ socialLinks: cleaned }) })
    if (res.ok) {
      setSaved(true)
      setInitialState(JSON.stringify(cleaned))
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError("Failed to save social links.")
    }
    setLoading(false)
  }
  return (
    <div className="admin-card p-6">
      <div className="font-semibold text-lg mb-4">Social Media Links</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(links).map(k => (
          <div key={k}>
            <label className="text-xs text-navy-400 uppercase font-bold mb-1 block">{k}</label>
            <div className="flex gap-2">
              <input className="input-glass w-full rounded px-3 py-2 text-sm" placeholder={`https://${k}.com/yourpage`} value={(links as any)[k]} onChange={e => setLinks({ ...links, [k]: e.target.value })} />
              <a
                href={(links as any)[k] || "#"}
                target="_blank"
                rel="noreferrer"
                className={`admin-btn admin-btn-ghost text-xs ${!(links as any)[k] ? "pointer-events-none opacity-50" : ""}`}
              >
                Open
              </a>
            </div>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={loading} className="admin-btn admin-btn-primary mt-4 w-full">{loading ? "Saving…" : "Save Social Links"}</button>
      {saved && <SettingsStatusToast type="success" message="Settings saved successfully." />}
      {error && <SettingsStatusToast type="error" message={error} />}
      {hasUnsaved && <p className="mt-2 text-xs text-amber-300">You have unsaved changes.</p>}
    </div>
  )
}

export function NavbarLayoutCard() {
  const [layout, setLayout] = useState<"horizontal" | "vertical">("horizontal")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(j => { if (j) setLayout(j?.data?.navbarLayout ?? "horizontal") }).catch(() => {})
  }, [])
  const save = async (l: "horizontal" | "vertical") => {
    setLoading(true)
    setMessage(null)
    const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ navbarLayout: l }) })
    if (res.ok) {
      setLayout(l)
      setMessage("Settings saved successfully.")
    } else {
      setMessage("Failed to save navbar layout.")
    }
    setLoading(false)
  }
  return (
    <div className="admin-card p-6">
      <div className="font-semibold text-lg mb-1">Desktop Navbar Layout</div>
      <p className="text-sm text-navy-400 mb-4">Choose how the main navigation is displayed on desktop screens.</p>
      <div className="flex gap-4">
        <button onClick={() => save("horizontal")} disabled={loading} className={`flex-1 p-4 rounded-xl border-2 transition-all ${layout === "horizontal" ? "border-primary bg-primary/5" : "border-navy-700 bg-navy-800/20"}`}>
          <div className="text-sm font-bold flex items-center justify-center gap-2">⬒ Horizontal Top Bar</div>
          <div className="text-[10px] text-navy-400 mt-1">{layout === "horizontal" ? "Active" : "Click to activate"}</div>
        </button>
        <button onClick={() => save("vertical")} disabled={loading} className={`flex-1 p-4 rounded-xl border-2 transition-all ${layout === "vertical" ? "border-primary bg-primary/5" : "border-navy-700 bg-navy-800/20"}`}>
          <div className="text-sm font-bold flex items-center justify-center gap-2">▮ Vertical Sidebar</div>
          <div className="text-[10px] text-navy-400 mt-1">{layout === "vertical" ? "Active" : "Click to activate"}</div>
        </button>
      </div>
      {message && <SettingsStatusToast type={message.includes("Failed") ? "error" : "success"} message={message} />}
    </div>
  )
}

export function SeoVerificationCard() {
  const [codes, setCodes] = useState({ google: "", bing: "", yandex: "" })
  useEffect(() => {
    fetch("/api/settings", { cache: "no-store", credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(j => { if (j) setCodes(j?.data?.seoVerification ?? { google: "", bing: "", yandex: "" }) }).catch(() => {})
  }, [])
  const save = async () => {
    await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seoVerification: codes }) })
  }
  return (
    <div className="admin-card p-6">
      <div className="font-semibold text-lg mb-4">SEO Verification Codes</div>
      <div className="space-y-3">
        {Object.keys(codes).map(k => (
          <input key={k} className="input-glass w-full rounded px-4 py-2" placeholder={`${k} Verification Code`} value={(codes as any)[k]} onChange={e => setCodes({ ...codes, [k]: e.target.value })} onBlur={save} />
        ))}
      </div>
    </div>
  )
}

export { TargetAudienceCard }

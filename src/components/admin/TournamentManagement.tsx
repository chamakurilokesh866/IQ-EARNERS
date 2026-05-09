"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"

const BulkCertificateExport = dynamic(() => import("./BulkExport"), { ssr: false })

function ParticipantsAdminList() {
  const [participants, setParticipants] = useState<any[]>([])
  useEffect(() => {
    fetch("/api/participants", { cache: "no-store", credentials: "include" }).then((r) => r.json()).then((j) => setParticipants(j.data ?? [])).catch(() => setParticipants([]))
  }, [])
  const refresh = async () => {
    const j = await fetch("/api/participants", { cache: "no-store", credentials: "include" }).then((r) => r.json())
    setParticipants(j.data ?? [])
  }
  return (
    <div className="mt-4">
      {!participants.length ? <div className="text-sm text-navy-300">No participants</div> : (
        <ul className="space-y-2">
          {participants.map((p) => (
            <li key={p.id ?? p.name} className="flex items-center justify-between rounded bg-navy-700 p-3">
              <div className="font-medium">{p.name}</div>
              {p.id && <button className="admin-btn admin-btn-danger text-xs" onClick={async () => { const r = await fetch(`/api/participants/${p.id}`, { method: "DELETE", credentials: "include" }); if (r.ok) refresh(); }}>Delete</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function TournamentManagement() {
  const [items, setItems] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [uploadingQuiz, setUploadingQuiz] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [quizPdfUrl, setQuizPdfUrl] = useState("")
  const [form, setForm] = useState({
    title: "",
    description: "",
    entryFee: "₹0",
    fee: 0,
    quizId: "",
    prizePool: "₹0",
    capacity: 0,
    questions: 0,
    duration: "",
    endTime: "",
    cashfreeFormUrl: ""
  })
  const refresh = useCallback(async () => {
    const j = await fetch("/api/tournaments", { cache: "no-store", credentials: "include" }).then((r) => r.json()).catch(() => ({}))
    setItems(Array.isArray(j?.data) ? j.data : [])
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])
  useEffect(() => {
    fetch("/api/quizzes", { cache: "no-store", credentials: "include" }).then((r) => r.json()).then((j) => setQuizzes(j.data ?? [])).catch(() => setQuizzes([]))
  }, [])

  const doAfterQuizUpload = (j: { id?: string; count?: number }) => {
    const quizId = String(j?.id ?? "")
    const count = j?.count ?? 0
    fetch(`/api/quizzes?quizId=${encodeURIComponent(quizId)}`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((quizJson) => {
        const created = Array.isArray(quizJson?.data) ? quizJson.data[0] : null
        if (created) {
          setQuizzes((prev) => {
            const merged = prev.filter((q: any) => q.id !== quizId)
            merged.push(created)
            return merged
          })
        }
        setForm((prev) => ({ ...prev, quizId, questions: created?.questions?.length ?? count ?? prev.questions }))
      })
      .catch(() => setForm((prev) => ({ ...prev, quizId, questions: count || prev.questions })))
  }
  const uploadTournamentQuiz = async (file: File) => {
    setUploadError(null)
    setUploadingQuiz(true)
    try {
      const fd = new FormData()
      fd.set("file", file)
      fd.set("title", form.title || file.name || "Tournament Quiz")
      fd.set("quiz_type", "tournament")
      const res = await fetch("/api/quizzes/upload-tournament", { method: "POST", credentials: "include", body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok || !j?.id) throw new Error(j?.error || "Failed to upload quiz.")
      doAfterQuizUpload(j)
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload quiz.")
    } finally {
      setUploadingQuiz(false)
    }
  }
  const uploadQuizFromUrl = async () => {
    const url = quizPdfUrl.trim()
    if (!url) return
    setUploadError(null)
    setUploadingQuiz(true)
    try {
      const res = await fetch("/api/quizzes/upload-tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pdfUrl: url, title: form.title || "Tournament Quiz", quiz_type: "tournament" })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.ok || !j?.id) throw new Error(j?.error || "Failed to extract from URL.")
      doAfterQuizUpload(j)
      setQuizPdfUrl("")
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Failed to extract from URL.")
    } finally {
      setUploadingQuiz(false)
    }
  }
  const save = async () => {
    const endTime = form.endTime || (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString() })()
    const item = { ...form, enrolled: 0, endTime, prizePool: form.prizePool || "₹0", capacity: form.capacity || 100 }
    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ item })
    })
    if (res.ok) {
      await refresh()
      setAdding(false)
      setStep(1)
      setForm({ title: "", description: "", entryFee: "₹0", fee: 0, quizId: "", prizePool: "₹0", capacity: 0, questions: 0, duration: "", endTime: "", cashfreeFormUrl: "" })
    } else {
      const j = await res.json().catch(() => ({}))
      alert(j?.error || "Failed to create tournament")
    }
  }
  const getEndTimeIso = () => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 16)
  }
  const [participantName, setParticipantName] = useState("")
  const addParticipant = async () => {
    if (!participantName.trim()) return
    const res = await fetch("/api/participants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item: { name: participantName } }) })
    if (res.ok) setParticipantName("")
  }
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <BulkCertificateExport tournaments={items} quizzes={quizzes} />
        <div className="flex items-center justify-between mt-8">
          <div>
            <div className="font-semibold text-lg">Tournament Management</div>
            <p className="text-sm text-navy-400 mt-0.5">Create and manage tournaments. Link prizes in Prizes section.</p>
          </div>
          <button className="admin-btn admin-btn-primary shrink-0" onClick={() => { setAdding((a) => !a); setStep(1) }}>{adding ? "Cancel" : "+ Create Tournament"}</button>
        </div>
        {adding && (
          <div className="mt-6 rounded-xl border border-navy-600 p-6 space-y-6">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <button key={s} onClick={() => setStep(s as 1 | 2 | 3)} className={`pill ${step === s ? "bg-primary" : "bg-navy-700"}`}>
                  Step {s}: {s === 1 ? "Basic" : s === 2 ? "Schedule & Entry" : "Quiz & Prizes"}
                </button>
              ))}
            </div>
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Tournament Title</label>
                  <input className="w-full admin-form-field" placeholder="e.g. Weekly Quiz Challenge" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Description</label>
                  <textarea className="w-full admin-form-field" rows={3} placeholder="Describe the tournament..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-navy-400 mb-1">End Date & Time</label>
                  <input className="w-full admin-form-field" type="datetime-local" value={form.endTime ? form.endTime.slice(0, 16) : getEndTimeIso()} onChange={(e) => setForm({ ...form, endTime: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Duration (e.g. 25 mins)</label>
                  <input className="w-full admin-form-field" placeholder="25 mins" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Entry Fee (₹)</label>
                  <input className="w-full admin-form-field" type="number" placeholder="99" value={form.fee || ""} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) || 0, entryFee: `₹${e.target.value || 0}` })} />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Max Capacity</label>
                  <input className="w-full admin-form-field" type="number" placeholder="100" value={form.capacity || ""} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-navy-400 mb-1">Cashfree Pay Button URL (optional)</label>
                  <input className="w-full admin-form-field" type="url" placeholder="https://payments.cashfree.com/forms/..." value={form.cashfreeFormUrl || ""} onChange={(e) => setForm({ ...form, cashfreeFormUrl: e.target.value.trim() })} />
                  <p className="text-[10px] text-navy-500 mt-1">Redirect URL in Cashfree: https://your-domain.com/payment/callback (Cashfree appends order_id automatically)</p>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs text-navy-400 mb-1">Quiz (questions for this tournament)</label>
                  <select className="w-full admin-form-field" value={form.quizId} onChange={(e) => {
                    const q = quizzes.find((x: any) => x.id === e.target.value)
                    setForm({ ...form, quizId: e.target.value, questions: q?.questions?.length ?? 0 })
                  }}>
                    <option value="">— Select existing quiz or leave blank —</option>
                    {quizzes.map((q: any) => (
                      <option key={q.id} value={q.id}>{q.title ?? q.id} ({q.questions?.length ?? 0} Qs)</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-navy-500 mt-1">
                    Upload questions (PDF, Excel, JSON, or CSV). AI parses complex PDFs. When AI fails, upload PDF to Supabase Storage and paste URL.
                  </p>
                  <label className="admin-btn admin-btn-ghost text-xs cursor-pointer inline-flex items-center gap-1">
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.json,.csv"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) uploadTournamentQuiz(f)
                        e.target.value = ""
                      }}
                    />
                    📤 Upload PDF / Excel / JSON / CSV
                  </label>
                  <p className="text-[10px] text-navy-500 mt-2">— or paste PDF URL (Supabase storage) —</p>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="url"
                      placeholder="https://...supabase.co/storage/v1/object/public/uploads/..."
                      value={quizPdfUrl}
                      onChange={(e) => setQuizPdfUrl(e.target.value)}
                      className="flex-1 admin-form-field text-xs py-2"
                    />
                    <button
                      type="button"
                      onClick={uploadQuizFromUrl}
                      disabled={!quizPdfUrl.trim() || uploadingQuiz}
                      className="admin-btn admin-btn-ghost text-xs shrink-0"
                    >
                      Extract from URL
                    </button>
                  </div>
                  {uploadingQuiz && (
                    <span className="text-xs text-primary ml-2">Parsing & saving…</span>
                  )}
                  {uploadError && (
                    <p className="text-xs text-amber-500 mt-1">{uploadError}</p>
                  )}
                  {form.quizId && (
                    <p className="text-xs text-navy-400 mt-1">
                      Linked quiz ID: <span className="font-mono text-xs text-primary">{form.quizId}</span>
                      {form.questions ? ` • ${form.questions} questions` : ""}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Prize Pool (display text, e.g. ₹5,000)</label>
                  <input className="w-full admin-form-field" placeholder="₹5,000" value={form.prizePool} onChange={(e) => setForm({ ...form, prizePool: e.target.value })} />
                </div>
                <p className="text-xs text-navy-400">Link prizes to this tournament in the Prizes section after creating.</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-4 border-t border-navy-700">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3) : setAdding(false)}>{step > 1 ? "Back" : "Cancel"}</button>
              {step < 3 ? <button type="button" className="admin-btn admin-btn-primary" onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}>Next</button> : <button type="button" className="admin-btn admin-btn-primary" onClick={save}>Create Tournament</button>}
            </div>
          </div>
        )}
        <div className="mt-6">
          <div className="text-sm font-medium text-navy-300 mb-3">Existing tournaments</div>
          {!items.length ? <div className="text-sm text-navy-400">No tournaments yet</div> : (
            <ul className="space-y-3">
              {items.map((t) => (
                <li key={t.id ?? t.title} className="rounded-xl bg-navy-700/80 border border-navy-600 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{t.title}</div>
                      <div className="text-xs text-navy-400 mt-1">Capacity {t.capacity ?? 0} • Enrolled {t.enrolled ?? 0} • Ends {t.endTime ? new Date(t.endTime).toLocaleString() : "—"}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input className="admin-form-field text-xs py-1.5 w-20" defaultValue={t.prizePool ?? ""} placeholder="Prize" onBlur={(e) => fetch(`/api/tournaments/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ prizePool: (e.target as HTMLInputElement).value }) }).then(refresh)} />
                      <input className="admin-form-field text-xs py-1.5 w-16" type="number" defaultValue={t.capacity ?? 0} placeholder="Cap" onBlur={(e) => fetch(`/api/tournaments/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ capacity: Number((e.target as HTMLInputElement).value) }) }).then(refresh)} />
                      <input className="admin-form-field text-xs py-1.5 w-40 min-w-0" defaultValue={t.cashfreeFormUrl ?? ""} placeholder="Cashfree URL" title={t.cashfreeFormUrl ?? ""} onBlur={(e) => fetch(`/api/tournaments/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ cashfreeFormUrl: (e.target as HTMLInputElement).value.trim() }) }).then(refresh)} />
                      <button className="admin-btn admin-btn-danger" onClick={() => fetch(`/api/tournaments/${t.id}`, { method: "DELETE", credentials: "include" }).then(refresh)}>Delete</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="card p-6">
        <div className="font-semibold">Participants</div>
        <div className="mt-3 flex items-center gap-3">
          <input className="admin-form-field" placeholder="Participant name" value={participantName} onChange={(e) => setParticipantName(e.target.value)} />
          <button className="admin-btn admin-btn-primary" onClick={addParticipant}>Add</button>
        </div>
        <div className="mt-2 text-xs text-navy-300">Participants appear on the tournament page.</div>
        <ParticipantsAdminList />
      </div>
    </div>
  )
}

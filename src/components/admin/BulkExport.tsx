"use client"
import { useState } from "react"
import { generateCertificate } from "../../utils/certificatePdf"

export default function BulkCertificateExport({ tournaments = [], quizzes = [] }: { tournaments: any[], quizzes: any[] }) {
    const [selectedId, setSelectedId] = useState("")
    const [type, setType] = useState<"tournament" | "quiz">("tournament")
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState("")

    const handleExport = async () => {
        if (!selectedId) return
        setLoading(true)
        setStatus("Fetching participants...")

        try {
            // Fetch completions for this tournament/quiz
            const endpoint = `/api/admin/quiz-completion?${type}Id=${selectedId}`
            const res = await fetch(endpoint, { cache: "no-store", credentials: "include" })
            const json = await res.json()

            if (!res.ok || !json.ok || !Array.isArray(json.data)) {
                throw new Error(json.error || "Failed to fetch data")
            }

            const completions = json.data
            if (completions.length === 0) {
                setStatus("No completions found for this event.")
                setLoading(false)
                return
            }

            setStatus(`Found ${completions.length} recipients. Generating PDFs...`)

            // Process in batches or one by one to avoid browser crash
            for (let i = 0; i < completions.length; i++) {
                const c = completions[i]
                setStatus(`Generating (${i + 1}/${completions.length}): ${c.username}`)
                
                await generateCertificate({
                    recipientName: c.username || "Winner",
                    tournamentName: json.eventTitle || "IQ Earners Tournament",
                    date: new Date(c.created_at || Date.now()).toLocaleDateString(),
                    memberId: c.memberId || `IQ-${selectedId.slice(0,4)}-${c.username.slice(0,3)}`.toUpperCase(),
                    type: i === 0 ? "1st" : i === 1 ? "runner_up" : "participation"
                })
                
                // Small delay to ensure browser handles downloads
                await new Promise(r => setTimeout(r, 500))
            }

            setStatus("Export complete! Check your downloads.")
        } catch (err: any) {
            setStatus(`Error: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="admin-card p-6 border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📜</span>
                <div>
                    <h3 className="font-bold text-lg">Bulk Certificate Export</h3>
                    <p className="text-xs text-navy-400">Generate and download certificates for all participants at once.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={type === "tournament"} onChange={() => setType("tournament")} className="text-primary" />
                        <span className="text-sm font-medium">Tournament</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={type === "quiz"} onChange={() => setType("quiz")} className="text-primary" />
                        <span className="text-sm font-medium">Quiz</span>
                    </label>
                </div>

                <select 
                    value={selectedId} 
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full rounded-xl bg-navy-800 border border-navy-600 px-4 py-2.5 text-sm text-white"
                >
                    <option value="">— Select {type} —</option>
                    {(type === "tournament" ? tournaments : quizzes).map((item: any) => (
                        <option key={item.id} value={item.id}>{item.title} ({item.enrolled ?? item.questions?.length ?? 0})</option>
                    ))}
                </select>

                <button 
                    onClick={handleExport}
                    disabled={loading || !selectedId}
                    className="admin-btn admin-btn-amber w-full py-3 font-bold shadow-lg shadow-amber-500/10"
                >
                    {loading ? "Processing..." : "Export All Certificates (ZIP/Individual)"}
                </button>

                {status && (
                    <div className="p-3 rounded-lg bg-navy-900 border border-navy-700">
                        <p className="text-[11px] font-mono text-amber-400 animate-pulse">{status}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

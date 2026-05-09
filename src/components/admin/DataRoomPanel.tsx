"use client"

import { useEffect, useState } from "react"

type DataRoomPayload = {
  generatedAt: string
  business: {
    revenueAllTime: number
    mrr: number
    arrRunRate: number
    totalProfiles: number
    paidProfiles: number
    conversionRate: number
  }
  enterprise: {
    organizations: number
    subscriptions: number
    activeSubscriptions: number
  }
  technicalReadiness: { key: string; label: string; pass: boolean }[]
  riskNotes: string[]
}

export default function DataRoomPanel() {
  const [data, setData] = useState<DataRoomPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const r = await fetch("/api/admin/dataroom", { credentials: "include", cache: "no-store" })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Request failed (${r.status})`)
      setData(j.data as DataRoomPayload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load data room snapshot")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const exportSnapshot = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `buyer-dataroom-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportPdfMemo = async () => {
    if (!data) return
    const [{ default: jsPDF }] = await Promise.all([import("jspdf")])
    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const marginX = 44
    let y = 96
    const lineHeight = 18
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const reportTitle = "IQ-EARNERS - Buyer Data Room Memo"

    const drawPageFrame = () => {
      doc.setDrawColor(124, 58, 237)
      doc.setLineWidth(1.2)
      doc.line(marginX, 34, pageWidth - marginX, 34)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.setTextColor(35, 35, 50)
      doc.text("IQ", marginX, 26)
      doc.setFontSize(11)
      doc.text(reportTitle, marginX + 24, 26)

      doc.setDrawColor(220, 220, 235)
      doc.setLineWidth(0.8)
      doc.line(marginX, pageHeight - 38, pageWidth - marginX, pageHeight - 38)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(90, 90, 110)
      doc.text("Confidential - Prepared for potential acquirers/investors", marginX, pageHeight - 24)
      doc.text(`Generated ${new Date(data.generatedAt).toLocaleString()}`, pageWidth - marginX, pageHeight - 24, {
        align: "right"
      })
      doc.setTextColor(0, 0, 0)
    }

    const addHeading = (text: string) => {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.text(text, marginX, y)
      y += 26
    }
    const addLabelValue = (label: string, value: string) => {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text(`${label}:`, marginX, y)
      doc.setFont("helvetica", "normal")
      doc.text(value, marginX + 170, y)
      y += lineHeight
    }
    const addBullet = (text: string) => {
      const wrapped = doc.splitTextToSize(`- ${text}`, 500)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(wrapped, marginX, y)
      y += wrapped.length * 14
    }
    const pageGuard = () => {
      if (y < 700) return
      doc.addPage()
      y = 96
      drawPageFrame()
    }

    drawPageFrame()
    addHeading("Buyer Data Room Memo")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date(data.generatedAt).toLocaleString()}`, marginX, y)
    y += 28

    addHeading("Business Snapshot")
    addLabelValue("MRR", `INR ${data.business.mrr.toLocaleString()}`)
    addLabelValue("ARR run-rate", `INR ${data.business.arrRunRate.toLocaleString()}`)
    addLabelValue("All-time revenue", `INR ${data.business.revenueAllTime.toLocaleString()}`)
    addLabelValue("Paid conversion", `${data.business.conversionRate.toFixed(2)}%`)
    addLabelValue("Paid profiles", `${data.business.paidProfiles.toLocaleString()} / ${data.business.totalProfiles.toLocaleString()}`)
    y += 8
    pageGuard()

    addHeading("Enterprise Snapshot")
    addLabelValue("Organizations", String(data.enterprise.organizations))
    addLabelValue("Subscriptions", String(data.enterprise.subscriptions))
    addLabelValue("Active subscriptions", String(data.enterprise.activeSubscriptions))
    y += 8
    pageGuard()

    addHeading("Technical Readiness")
    for (const item of data.technicalReadiness) {
      addBullet(`${item.label}: ${item.pass ? "PASS" : "NEEDS WORK"}`)
      pageGuard()
    }
    y += 8
    pageGuard()

    addHeading("Risk Notes")
    for (const note of data.riskNotes) {
      addBullet(note)
      pageGuard()
    }
    y += 14
    pageGuard()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("Prepared by: IQ Platform Admin", marginX, y)
    y += 16
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("For detailed diligence, include retention cohorts, reconciliation exports, and incident logs.", marginX, y)

    doc.save(`buyer-dataroom-memo-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="space-y-6">
      <div className="admin-card p-6 border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-black text-white text-lg">Buyer Data Room</h3>
            <p className="text-xs text-navy-400 mt-1">Due-diligence snapshot for acquirers and investors.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void load()} className="admin-btn admin-btn-ghost-dark text-xs px-3 py-2">
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void exportPdfMemo()}
              disabled={!data}
              className="admin-btn admin-btn-ghost-dark text-xs px-3 py-2 disabled:opacity-50"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={exportSnapshot}
              disabled={!data}
              className="admin-btn admin-btn-primary text-xs px-3 py-2 disabled:opacity-50"
            >
              Export JSON
            </button>
          </div>
        </div>

        {err && <p className="text-xs text-red-300">{err}</p>}
        {!data && !err && <p className="text-sm text-navy-400">Loading data room snapshot…</p>}

        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="MRR" value={`₹${data.business.mrr.toLocaleString()}`} />
            <Metric label="ARR run-rate" value={`₹${data.business.arrRunRate.toLocaleString()}`} />
            <Metric label="Paid conversion" value={`${data.business.conversionRate.toFixed(2)}%`} />
            <Metric label="All-time revenue" value={`₹${data.business.revenueAllTime.toLocaleString()}`} />
          </div>
        )}
      </div>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="admin-card p-6">
            <h4 className="font-black text-white mb-3">Technical readiness</h4>
            <ul className="space-y-2">
              {data.technicalReadiness.map((item) => (
                <li key={item.key} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
                  <span className="text-white/80">{item.label}</span>
                  <span className={item.pass ? "text-emerald-300" : "text-amber-300"}>{item.pass ? "Pass" : "Needs work"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="admin-card p-6">
            <h4 className="font-black text-white mb-3">Risk notes</h4>
            <ul className="space-y-2 text-sm text-navy-300">
              {data.riskNotes.map((n) => (
                <li key={n} className="rounded-lg border border-white/10 px-3 py-2">
                  {n}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-navy-500 mt-4">Snapshot generated: {new Date(data.generatedAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-navy-500 font-bold">{label}</div>
      <div className="text-lg text-white font-black mt-1">{value}</div>
    </div>
  )
}

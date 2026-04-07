"use client"

import { useState, useCallback, useEffect } from "react"
import { adminFetch } from "@/lib/admin/client"

type WhiteLabelConfig = {
  orgId?: string
  orgName?: string
  brandName: string
  tagline: string
  primaryColor: string
  accentColor: string
  logoUrl: string
  faviconUrl: string
  customDomain: string
  customCss: string
  emailFromName: string
  emailFromAddress: string
  certificateTemplate: string
  footerText: string
  hideIqBranding: boolean
  customLoginPage: boolean
  customTermsUrl: string
  customPrivacyUrl: string
}

const DEFAULT_CONFIG: WhiteLabelConfig = {
  brandName: "", tagline: "", primaryColor: "#7c3aed", accentColor: "#f5b301",
  logoUrl: "", faviconUrl: "", customDomain: "", customCss: "",
  emailFromName: "", emailFromAddress: "", certificateTemplate: "default",
  footerText: "", hideIqBranding: false, customLoginPage: false,
  customTermsUrl: "", customPrivacyUrl: "",
}

const COLOR_PRESETS = [
  { name: "Ocean Blue", primary: "#7c3aed", accent: "#06b6d4" },
  { name: "Royal Purple", primary: "#7c3aed", accent: "#c084fc" },
  { name: "Forest Green", primary: "#059669", accent: "#34d399" },
  { name: "Sunset Orange", primary: "#ea580c", accent: "#fb923c" },
  { name: "Crimson Red", primary: "#dc2626", accent: "#f87171" },
  { name: "Deep Indigo", primary: "#4338ca", accent: "#818cf8" },
]

export default function WhiteLabelSettings() {
  const [config, setConfig] = useState<WhiteLabelConfig>(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/white-label")
      const j = await res.json().catch(() => ({}))
      if (j?.data) setConfig((prev) => ({ ...prev, ...j.data }))
    } catch { /* use defaults */ }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const save = async () => {
    setSaving(true)
    try {
      await adminFetch("/api/admin/white-label", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    setSaving(false)
  }

  const updateField = <K extends keyof WhiteLabelConfig>(key: K, value: WhiteLabelConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Preview banner */}
      <div className="admin-card overflow-hidden">
        <div className="p-6 relative" style={{ background: `linear-gradient(135deg, ${config.primaryColor}22, ${config.accentColor}11)` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />
          <div className="relative flex items-center gap-4">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black" style={{ background: config.primaryColor, color: "#fff" }}>
                {config.brandName?.charAt(0) || "Q"}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black text-white">{config.brandName || "Your Brand"}</h2>
              <p className="text-xs text-white/50">{config.tagline || "Your custom tagline"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branding */}
        <div className="admin-card p-6">
          <h3 className="text-base font-black text-white mb-4">Branding</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Brand Name</label>
              <input value={config.brandName} onChange={(e) => updateField("brandName", e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="e.g. Delhi Public School Quiz" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Tagline</label>
              <input value={config.tagline} onChange={(e) => updateField("tagline", e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="e.g. Learn, Compete, Excel" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Logo URL</label>
              <input value={config.logoUrl} onChange={(e) => updateField("logoUrl", e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="https://..." />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Custom Domain</label>
              <input value={config.customDomain} onChange={(e) => updateField("customDomain", e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:ring-2 focus:ring-primary/30 focus:outline-none" placeholder="quiz.myschool.edu" />
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="admin-card p-6">
          <h3 className="text-base font-black text-white mb-4">Theme Colors</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Primary</label>
                <div className="flex gap-2">
                  <input type="color" value={config.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                  <input value={config.primaryColor} onChange={(e) => updateField("primaryColor", e.target.value)} className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Accent</label>
                <div className="flex gap-2">
                  <input type="color" value={config.accentColor} onChange={(e) => updateField("accentColor", e.target.value)} className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                  <input value={config.accentColor} onChange={(e) => updateField("accentColor", e.target.value)} className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-xs text-white font-mono focus:outline-none" />
                </div>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-2 block">Presets</label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button key={p.name} type="button" onClick={() => { updateField("primaryColor", p.primary); updateField("accentColor", p.accent) }} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 hover:border-white/15 transition-all">
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full" style={{ background: p.primary }} />
                      <div className="w-4 h-4 rounded-full" style={{ background: p.accent }} />
                    </div>
                    <span className="text-[9px] font-bold text-white/50">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Emails & Certificates */}
        <div className="admin-card p-6">
          <h3 className="text-base font-black text-white mb-4">Email &amp; Certificates</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Email From Name</label>
                <input value={config.emailFromName} onChange={(e) => updateField("emailFromName", e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" placeholder="My School" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Email Address</label>
                <input value={config.emailFromAddress} onChange={(e) => updateField("emailFromAddress", e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" placeholder="quiz@school.edu" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Footer Text</label>
              <input value={config.footerText} onChange={(e) => updateField("footerText", e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none" placeholder="© 2026 My School. All rights reserved." />
            </div>
          </div>
        </div>

        {/* Advanced */}
        <div className="admin-card p-6">
          <h3 className="text-base font-black text-white mb-4">Advanced Options</h3>
          <div className="space-y-3">
            {[
              { key: "hideIqBranding" as const, label: "Hide IQ Earners branding", desc: "Remove all platform branding (Enterprise only)" },
              { key: "customLoginPage" as const, label: "Custom login page", desc: "Use organization-branded login screen" },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3">
                <div>
                  <div className="text-sm font-bold text-white">{opt.label}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{opt.desc}</div>
                </div>
                <button type="button" onClick={() => updateField(opt.key, !config[opt.key])} className={`w-12 h-6 rounded-full transition-colors flex items-center ${config[opt.key] ? "bg-primary/60" : "bg-white/10"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${config[opt.key] ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1 block">Custom CSS</label>
              <textarea value={config.customCss} onChange={(e) => updateField("customCss", e.target.value)} rows={4} className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2.5 text-xs text-white font-mono placeholder:text-white/30 focus:outline-none resize-none" placeholder=":root { --primary: #7c3aed; }" />
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="admin-btn admin-btn-primary text-xs py-2.5 px-8">
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save White Label Settings"}
        </button>
      </div>
    </div>
  )
}

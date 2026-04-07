"use client"

import { useState } from "react"

export type SponsorFormKind = "sponsor" | "promotion" | "collaboration" | "university"

const CHECK = "☐"
const CHECKED = "☑"

function Checkbox({
  checked,
  onChange,
  label,
  name
}: { checked: boolean; onChange: (v: boolean) => void; label: string; name: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-navy-200">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-white/30 bg-black/40 text-primary focus:ring-primary"
      />
      <span>{label}</span>
    </label>
  )
}

function CheckboxGroup<T extends string>({
  options,
  value,
  onChange,
  namePrefix
}: {
  options: { id: T; label: string }[]
  value: T[]
  onChange: (v: T[]) => void
  namePrefix: string
}) {
  const toggle = (id: T) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else onChange([...value, id])
  }
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <Checkbox
          key={opt.id}
          name={`${namePrefix}-${opt.id}`}
          checked={value.includes(opt.id)}
          onChange={() => toggle(opt.id)}
          label={opt.label}
        />
      ))}
    </div>
  )
}

type FormState = Record<string, string | string[]>

function useFormState(initial: FormState) {
  const [state, setState] = useState<FormState>(initial)
  const set = (k: string, v: string | string[]) => setState((s) => ({ ...s, [k]: v }))
  const get = (k: string) => state[k]
  const getStr = (k: string) => (typeof state[k] === "string" ? state[k] : Array.isArray(state[k]) ? (state[k] as string[]).join(", ") : "") as string
  const getArr = (k: string) => (Array.isArray(state[k]) ? (state[k] as string[]) : []) as string[]
  return { state, set, get, getStr, getArr }
}

export default function SponsorForms({
  onSubmit,
  onCancel
}: {
  onSubmit: (payload: { kind: SponsorFormKind; formData: Record<string, unknown> }) => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<SponsorFormKind>("sponsor")

  const sponsor = useFormState({
    fullName: "",
    workEmail: "",
    phone: "",
    companyBrand: "",
    websiteSocial: "",
    amount: "",
    prizeDetails: "",
    geographicFocus: "",
    stateCity: "",
    startDate: "",
    duration: "",
    additionalNotes: ""
  })
  const promotion = useFormState({
    fullName: "",
    workEmail: "",
    brandOrg: "",
    phone: "",
    productService: "",
    category: "",
    websiteLink: "",
    ageGroup: "",
    estimatedBudget: "",
    pricingModel: "",
    startDate: "",
    endDate: ""
  })
  const collaboration = useFormState({
    fullName: "",
    email: "",
    orgName: "",
    rolePosition: "",
    socialLinks: "",
    aboutOrg: "",
    proposalWhat: "",
    proposalBenefit: "",
    audienceReach: "",
    revenueModel: "",
    launchDate: "",
    duration: "",
    additionalDocs: ""
  })
  const university = useFormState({
    fullName: "",
    workEmail: "",
    institutionName: "",
    rolePosition: "",
    website: "",
    studentCount: "",
    proposal: "",
    additionalNotes: ""
  })

  const buildPayload = (): Record<string, unknown> => {
    if (kind === "sponsor") {
      return {
        fullName: sponsor.getStr("fullName"),
        workEmail: sponsor.getStr("workEmail"),
        phone: sponsor.getStr("phone"),
        companyBrand: sponsor.getStr("companyBrand"),
        websiteSocial: sponsor.getStr("websiteSocial"),
        sponsorshipType: sponsor.getArr("sponsorshipType"),
        amount: sponsor.getStr("amount"),
        prizeDetails: sponsor.getStr("prizeDetails"),
        targetAudience: sponsor.getArr("targetAudience"),
        geographicFocus: sponsor.getStr("geographicFocus"),
        stateCity: sponsor.getStr("stateCity"),
        startDate: sponsor.getStr("startDate"),
        duration: sponsor.getStr("duration"),
        deliverables: sponsor.getArr("deliverables"),
        additionalNotes: sponsor.getStr("additionalNotes")
      }
    }
    if (kind === "promotion") {
      return {
        fullName: promotion.getStr("fullName"),
        workEmail: promotion.getStr("workEmail"),
        brandOrg: promotion.getStr("brandOrg"),
        phone: promotion.getStr("phone"),
        productService: promotion.getStr("productService"),
        category: promotion.getStr("category"),
        websiteLink: promotion.getStr("websiteLink"),
        targetAudience: promotion.getArr("targetAudience"),
        ageGroup: promotion.getStr("ageGroup"),
        promotionType: promotion.getArr("promotionType"),
        estimatedBudget: promotion.getStr("estimatedBudget"),
        pricingModel: promotion.getStr("pricingModel"),
        startDate: promotion.getStr("startDate"),
        endDate: promotion.getStr("endDate"),
        campaignObjective: promotion.getArr("campaignObjective")
      }
    }
    if (kind === "collaboration") {
      return {
        fullName: collaboration.getStr("fullName"),
        email: collaboration.getStr("email"),
        orgName: collaboration.getStr("orgName"),
        rolePosition: collaboration.getStr("rolePosition"),
        socialLinks: collaboration.getStr("socialLinks"),
        collaborationType: collaboration.getArr("collaborationType"),
        aboutOrg: collaboration.getStr("aboutOrg"),
        proposalWhat: collaboration.getStr("proposalWhat"),
        proposalBenefit: collaboration.getStr("proposalBenefit"),
        audienceReach: collaboration.getStr("audienceReach"),
        revenueModel: collaboration.getStr("revenueModel"),
        targetAudience: collaboration.getArr("targetAudience"),
        launchDate: collaboration.getStr("launchDate"),
        duration: collaboration.getStr("duration"),
        additionalDocs: collaboration.getStr("additionalDocs")
      }
    }
    return {
      fullName: university.getStr("fullName"),
      workEmail: university.getStr("workEmail"),
      institutionName: university.getStr("institutionName"),
      rolePosition: university.getStr("rolePosition"),
      website: university.getStr("website"),
      studentCount: university.getStr("studentCount"),
      proposal: university.getStr("proposal"),
      additionalNotes: university.getStr("additionalNotes")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ kind, formData: buildPayload() })
  }

  const inputClass =
    "rounded-xl px-3.5 py-3 text-sm w-full bg-white/[0.05] border border-white/12 text-navy-100 placeholder:text-navy-500 outline-none transition-all focus:border-primary/55 focus:ring-2 focus:ring-primary/15 hover:border-white/18"
  const labelClass = "block text-[10px] font-black uppercase tracking-[0.16em] text-navy-300 mb-2"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {[
          { id: "sponsor" as const, label: "🏆 1️⃣ Sponsorship" },
          { id: "promotion" as const, label: "📢 2️⃣ Promotion" },
          { id: "collaboration" as const, label: "🤝 3️⃣ Collaboration" },
          { id: "university" as const, label: "🎓 4️⃣ University" }
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setKind(opt.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border ${kind === opt.id ? "bg-primary text-black border-primary" : "bg-black/30 text-navy-200 border-white/10 hover:bg-black/40"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {kind === "sponsor" && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-navy-100 mb-1">🏆 1️⃣ SPONSORSHIP FORM</h3>
            <p className="text-xs text-navy-400 mb-4">📩 Sponsorship Application – IQ Earners</p>
          </div>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">1. Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>Full Name:</label>
                <input required value={sponsor.getStr("fullName")} onChange={(e) => sponsor.set("fullName", e.target.value)} className={inputClass} placeholder="Full Name" />
              </div>
              <div>
                <label className={labelClass}>Work Email:</label>
                <input required type="email" value={sponsor.getStr("workEmail")} onChange={(e) => sponsor.set("workEmail", e.target.value)} className={inputClass} placeholder="Work Email" />
              </div>
              <div>
                <label className={labelClass}>Phone Number:</label>
                <input value={sponsor.getStr("phone")} onChange={(e) => sponsor.set("phone", e.target.value)} className={inputClass} placeholder="Phone Number" />
              </div>
              <div>
                <label className={labelClass}>Company / Brand Name:</label>
                <input required value={sponsor.getStr("companyBrand")} onChange={(e) => sponsor.set("companyBrand", e.target.value)} className={inputClass} placeholder="Company / Brand Name" />
              </div>
              <div>
                <label className={labelClass}>Website / Social Media Links:</label>
                <input value={sponsor.getStr("websiteSocial")} onChange={(e) => sponsor.set("websiteSocial", e.target.value)} className={inputClass} placeholder="Website / Social Media Links" />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">2. Sponsorship Type</h4>
            <CheckboxGroup
              namePrefix="sponsor-type"
              options={[
                { id: "cash", label: "Cash Sponsorship" },
                { id: "prize", label: "Prize Sponsorship" },
                { id: "event", label: "Event Sponsorship" },
                { id: "category", label: "Category Sponsorship" },
                { id: "leaderboard", label: "Leaderboard Sponsorship" }
              ]}
              value={sponsor.getArr("sponsorshipType")}
              onChange={(v) => sponsor.set("sponsorshipType", v)}
            />
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">3. Sponsorship Budget / Contribution</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Amount (₹):</label>
                <input value={sponsor.getStr("amount")} onChange={(e) => sponsor.set("amount", e.target.value)} className={inputClass} placeholder="Amount (₹)" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>OR Prize Details (if non-cash):</label>
                <input value={sponsor.getStr("prizeDetails")} onChange={(e) => sponsor.set("prizeDetails", e.target.value)} className={inputClass} placeholder="Prize Details (if non-cash)" />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">4. Target Audience</h4>
            <CheckboxGroup
              namePrefix="sponsor-audience"
              options={[
                { id: "1-5", label: "Classes 1–5" },
                { id: "6-10", label: "Classes 6–10" },
                { id: "11-12", label: "Classes 11–12" },
                { id: "college", label: "College Students" },
                { id: "exam", label: "Competitive Exam Aspirants" }
              ]}
              value={sponsor.getArr("targetAudience")}
              onChange={(v) => sponsor.set("targetAudience", v)}
            />
            <p className="text-xs text-navy-400 mt-2">Geographic Focus:</p>
            <div className="flex flex-wrap gap-3 mt-1">
              <Checkbox
                name="geo-telangana"
                checked={sponsor.getStr("geographicFocus") === "telangana"}
                onChange={(v) => sponsor.set("geographicFocus", v ? "telangana" : "")}
                label="Telangana"
              />
              <Checkbox
                name="geo-india"
                checked={sponsor.getStr("geographicFocus") === "india"}
                onChange={(v) => sponsor.set("geographicFocus", v ? "india" : "")}
                label="India"
              />
            </div>
            <div className="mt-2">
              <label className={labelClass}>Specific State/City:</label>
              <input value={sponsor.getStr("stateCity")} onChange={(e) => sponsor.set("stateCity", e.target.value)} className={inputClass} placeholder="Specific State/City" />
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">5. Campaign Duration</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Preferred Start Date:</label>
                <input value={sponsor.getStr("startDate")} onChange={(e) => sponsor.set("startDate", e.target.value)} type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Duration (Days / Weeks / Months):</label>
                <input value={sponsor.getStr("duration")} onChange={(e) => sponsor.set("duration", e.target.value)} className={inputClass} placeholder="e.g. 2 weeks" />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">6. Expected Deliverables</h4>
            <CheckboxGroup
              namePrefix="sponsor-deliverables"
              options={[
                { id: "banner", label: "App Banner Placement" },
                { id: "quiz", label: "Sponsored Quiz Contest" },
                { id: "leaderboard", label: "Logo on Leaderboard" },
                { id: "push", label: "Push Notifications" },
                { id: "social", label: "Social Media Mentions" },
                { id: "email", label: "Email Marketing" }
              ]}
              value={sponsor.getArr("deliverables")}
              onChange={(v) => sponsor.set("deliverables", v)}
            />
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">7. Additional Notes</h4>
            <textarea
              value={sponsor.getStr("additionalNotes")}
              onChange={(e) => sponsor.set("additionalNotes", e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Describe your campaign goals and expectations"
            />
          </section>
          <p className="text-xs text-navy-500">📌 We reply from contact@iqearners.online within 1–2 business days.</p>
        </>
      )}

      {kind === "promotion" && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-navy-100 mb-1">📢 2️⃣ PROMOTION REQUEST FORM</h3>
            <p className="text-xs text-navy-400 mb-4">📩 Promotion Inquiry – IQ Earners</p>
          </div>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">1. Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Full Name:</label>
                <input required value={promotion.getStr("fullName")} onChange={(e) => promotion.set("fullName", e.target.value)} className={inputClass} placeholder="Full Name" />
              </div>
              <div>
                <label className={labelClass}>Work Email:</label>
                <input required type="email" value={promotion.getStr("workEmail")} onChange={(e) => promotion.set("workEmail", e.target.value)} className={inputClass} placeholder="Work Email" />
              </div>
              <div>
                <label className={labelClass}>Brand / Organization:</label>
                <input required value={promotion.getStr("brandOrg")} onChange={(e) => promotion.set("brandOrg", e.target.value)} className={inputClass} placeholder="Brand / Organization" />
              </div>
              <div>
                <label className={labelClass}>Phone Number:</label>
                <input value={promotion.getStr("phone")} onChange={(e) => promotion.set("phone", e.target.value)} className={inputClass} placeholder="Phone Number" />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">2. What Would You Like to Promote?</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={labelClass}>Product / Service Name:</label>
                <input value={promotion.getStr("productService")} onChange={(e) => promotion.set("productService", e.target.value)} className={inputClass} placeholder="Product / Service Name" />
              </div>
              <div>
                <label className={labelClass}>Category (App / Course / Product / Event / etc.):</label>
                <input value={promotion.getStr("category")} onChange={(e) => promotion.set("category", e.target.value)} className={inputClass} placeholder="Category" />
              </div>
              <div>
                <label className={labelClass}>Website Link:</label>
                <input value={promotion.getStr("websiteLink")} onChange={(e) => promotion.set("websiteLink", e.target.value)} className={inputClass} placeholder="Website Link" type="url" />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">3. Target Audience</h4>
            <CheckboxGroup
              namePrefix="promo-audience"
              options={[
                { id: "school", label: "School Students" },
                { id: "college", label: "College Students" },
                { id: "exam", label: "Exam Aspirants" },
                { id: "teachers", label: "Teachers" },
                { id: "parents", label: "Parents" }
              ]}
              value={promotion.getArr("targetAudience")}
              onChange={(v) => promotion.set("targetAudience", v)}
            />
            <p className="text-xs text-navy-400 mt-2">Age Group:</p>
            <div className="flex flex-wrap gap-3 mt-1">
              {["6-10", "11-16", "17-22", "22+"].map((ag) => (
                <Checkbox
                  key={ag}
                  name={`age-${ag}`}
                  checked={promotion.getStr("ageGroup") === ag}
                  onChange={(v) => promotion.set("ageGroup", v ? ag : "")}
                  label={ag}
                />
              ))}
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">4. Promotion Type Required</h4>
            <CheckboxGroup
              namePrefix="promo-type"
              options={[
                { id: "banner", label: "Banner Ads" },
                { id: "quiz", label: "Sponsored Quiz" },
                { id: "popups", label: "In-App Popups" },
                { id: "whatsapp", label: "WhatsApp Campaign" },
                { id: "instagram", label: "Instagram Promotion" },
                { id: "featured", label: "Featured Category" }
              ]}
              value={promotion.getArr("promotionType")}
              onChange={(v) => promotion.set("promotionType", v)}
            />
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">5. Budget</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Estimated Budget:</label>
                <input value={promotion.getStr("estimatedBudget")} onChange={(e) => promotion.set("estimatedBudget", e.target.value)} className={inputClass} placeholder="Estimated Budget" />
              </div>
              <div>
                <label className={labelClass}>Preferred Pricing Model:</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["Fixed", "CPC", "CPM", "Revenue Share"].map((m) => (
                    <Checkbox
                      key={m}
                      name={`pricing-${m}`}
                      checked={promotion.getStr("pricingModel") === m}
                      onChange={(v) => promotion.set("pricingModel", v ? m : "")}
                      label={m}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">6. Campaign Timeline</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date:</label>
                <input value={promotion.getStr("startDate")} onChange={(e) => promotion.set("startDate", e.target.value)} type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Date:</label>
                <input value={promotion.getStr("endDate")} onChange={(e) => promotion.set("endDate", e.target.value)} type="date" className={inputClass} />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">7. Campaign Objective</h4>
            <CheckboxGroup
              namePrefix="promo-objective"
              options={[
                { id: "awareness", label: "Brand Awareness" },
                { id: "downloads", label: "App Downloads" },
                { id: "traffic", label: "Website Traffic" },
                { id: "leads", label: "Lead Generation" },
                { id: "sales", label: "Sales" }
              ]}
              value={promotion.getArr("campaignObjective")}
              onChange={(v) => promotion.set("campaignObjective", v)}
            />
          </section>
          <p className="text-xs text-navy-500">📌 We respond within 1–2 business days from contact@iqearners.online</p>
        </>
      )}

      {kind === "university" && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-navy-100 mb-1">🎓 4️⃣ UNIVERSITY REQUEST FORM</h3>
            <p className="text-xs text-navy-400 mb-4">📩 Multi-User Access & Institutional Licensing</p>
          </div>
          <section className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Admin/Rep Full Name:</label>
                <input required value={university.getStr("fullName")} onChange={(e) => university.set("fullName", e.target.value)} className={inputClass} placeholder="Full Name" />
              </div>
              <div>
                <label className={labelClass}>Institutional Email:</label>
                <input required type="email" value={university.getStr("workEmail")} onChange={(e) => university.set("workEmail", e.target.value)} className={inputClass} placeholder="edu@university.ac.in" />
              </div>
              <div>
                <label className={labelClass}>University/College Name:</label>
                <input required value={university.getStr("institutionName")} onChange={(e) => university.set("institutionName", e.target.value)} className={inputClass} placeholder="Institution Name" />
              </div>
              <div>
                <label className={labelClass}>Role (Dean, HOD, Coordinator):</label>
                <input required value={university.getStr("rolePosition")} onChange={(e) => university.set("rolePosition", e.target.value)} className={inputClass} placeholder="Your Position" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Official Website:</label>
                <input value={university.getStr("website")} onChange={(e) => university.set("website", e.target.value)} className={inputClass} placeholder="https://..." />
              </div>
            </div>
          </section>
          <section className="space-y-3">
             <div>
                <label className={labelClass}>Approximate Student Count:</label>
                <input value={university.getStr("studentCount")} onChange={(e) => university.set("studentCount", e.target.value)} className={inputClass} placeholder="e.g. 500-1000" />
              </div>
              <div>
                <label className={labelClass}>Proposal for IQ Earners Integration:</label>
                <textarea 
                  required 
                  value={university.getStr("proposal")} 
                  onChange={(e) => university.set("proposal", e.target.value)} 
                  rows={4} 
                  className={`${inputClass} resize-none`} 
                  placeholder="How can IQ Earners help your students?" 
                />
              </div>
              <div>
                <label className={labelClass}>Additional Notes:</label>
                <textarea 
                  value={university.getStr("additionalNotes")} 
                  onChange={(e) => university.set("additionalNotes", e.target.value)} 
                  rows={2} 
                  className={`${inputClass} resize-none`} 
                  placeholder="Any extra details..." 
                />
              </div>
          </section>
          <p className="text-xs text-navy-500">📌 We respond within 1–2 business days via institutional verification protocols.</p>
        </>
      )}

      {kind === "collaboration" && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-navy-100 mb-1">🤝 3️⃣ COLLABORATION FORM</h3>
            <p className="text-xs text-navy-400 mb-4">📩 Collaboration Proposal – IQ Earners</p>
          </div>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">1. Contact Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Full Name:</label>
                <input required value={collaboration.getStr("fullName")} onChange={(e) => collaboration.set("fullName", e.target.value)} className={inputClass} placeholder="Full Name" />
              </div>
              <div>
                <label className={labelClass}>Email:</label>
                <input required type="email" value={collaboration.getStr("email")} onChange={(e) => collaboration.set("email", e.target.value)} className={inputClass} placeholder="Email" />
              </div>
              <div>
                <label className={labelClass}>Organization Name:</label>
                <input required value={collaboration.getStr("orgName")} onChange={(e) => collaboration.set("orgName", e.target.value)} className={inputClass} placeholder="Organization Name" />
              </div>
              <div>
                <label className={labelClass}>Role / Position:</label>
                <input value={collaboration.getStr("rolePosition")} onChange={(e) => collaboration.set("rolePosition", e.target.value)} className={inputClass} placeholder="Role / Position" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Social Links / Website:</label>
                <input value={collaboration.getStr("socialLinks")} onChange={(e) => collaboration.set("socialLinks", e.target.value)} className={inputClass} placeholder="Social Links / Website" />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">2. Collaboration Type</h4>
            <CheckboxGroup
              namePrefix="collab-type"
              options={[
                { id: "co-branded", label: "Co-Branded Quiz Events" },
                { id: "content", label: "Educational Content Creation" },
                { id: "influencer", label: "Influencer Partnership" },
                { id: "affiliate", label: "Affiliate Partnership" },
                { id: "tech", label: "Tech Integration" },
                { id: "revenue", label: "Revenue Sharing" }
              ]}
              value={collaboration.getArr("collaborationType")}
              onChange={(v) => collaboration.set("collaborationType", v)}
            />
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">3. About Your Organization</h4>
            <textarea
              value={collaboration.getStr("aboutOrg")}
              onChange={(e) => collaboration.set("aboutOrg", e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Brief description of your company / institution"
            />
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">4. Collaboration Proposal Details</h4>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>What do you propose?</label>
                <textarea value={collaboration.getStr("proposalWhat")} onChange={(e) => collaboration.set("proposalWhat", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="What do you propose?" />
              </div>
              <div>
                <label className={labelClass}>How will both parties benefit?</label>
                <textarea value={collaboration.getStr("proposalBenefit")} onChange={(e) => collaboration.set("proposalBenefit", e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="How will both parties benefit?" />
              </div>
              <div>
                <label className={labelClass}>Estimated audience reach:</label>
                <input value={collaboration.getStr("audienceReach")} onChange={(e) => collaboration.set("audienceReach", e.target.value)} className={inputClass} placeholder="Estimated audience reach" />
              </div>
              <div>
                <label className={labelClass}>Revenue model (if any):</label>
                <input value={collaboration.getStr("revenueModel")} onChange={(e) => collaboration.set("revenueModel", e.target.value)} className={inputClass} placeholder="Revenue model (if any)" />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">5. Target Audience</h4>
            <CheckboxGroup
              namePrefix="collab-audience"
              options={[
                { id: "school", label: "School Students" },
                { id: "college", label: "College Students" },
                { id: "competitive", label: "Competitive Exam Students" },
                { id: "state", label: "State-Level Audience" },
                { id: "pan-india", label: "Pan-India" }
              ]}
              value={collaboration.getArr("targetAudience")}
              onChange={(v) => collaboration.set("targetAudience", v)}
            />
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">6. Proposed Timeline</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Launch Date:</label>
                <input value={collaboration.getStr("launchDate")} onChange={(e) => collaboration.set("launchDate", e.target.value)} type="date" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Duration:</label>
                <input value={collaboration.getStr("duration")} onChange={(e) => collaboration.set("duration", e.target.value)} className={inputClass} placeholder="Duration" />
              </div>
            </div>
          </section>
          <section>
            <h4 className="text-xs font-semibold text-navy-200 mb-2">7. Additional Documents</h4>
            <textarea
              value={collaboration.getStr("additionalDocs")}
              onChange={(e) => collaboration.set("additionalDocs", e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Attach brochure / pitch deck / proposal if available (or paste link)"
            />
          </section>
          <p className="text-xs text-navy-500">📌 Our team reviews proposals carefully and replies within 1–2 business days.</p>
        </>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/15 bg-white/[0.04] text-sm font-semibold text-navy-200 hover:bg-white/[0.08] transition-all active:scale-[0.98]"
        >
          Cancel
        </button>
        <button type="submit" className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">
          Send enquiry
        </button>
      </div>
    </form>
  )
}

"use client"

import { useModalA11y } from "@/hooks/useModalA11y"
import ParentCompanyMark from "./ParentCompanyMark"

type DocType = "terms" | "privacy" | "rules" | "grievance" | "refund" | "disclaimer" | "cookie"

const DOCS: Record<DocType, { title: string; subtitle?: string; content: React.ReactNode }> = {
  terms: {
    title: "Terms of Service",
    subtitle: "Last updated: February 2026. Governed by Indian law.",
    content: (
      <div className="space-y-4 text-sm text-navy-300">
        <section><h3 className="font-semibold text-primary">Corporate</h3><p className="mt-1 flex flex-wrap items-center gap-x-1.5">IQ Earners is offered under the parent company <ParentCompanyMark /></p></section>
        <section><h3 className="font-semibold text-primary">1. Acceptance</h3><p className="mt-1">By accessing IQ Earners, you agree to these Terms, our Privacy Policy, Rules & Regulations, and applicable Indian laws including the IT Act, 2000 and the Digital Personal Data Protection Act, 2023.</p></section>
        <section><h3 className="font-semibold">2. Eligibility</h3><p className="mt-1">You must be 18+ and legally capable. One account per person. Fair play mandatory.</p></section>
        <section><h3 className="font-semibold">3. Prizes & Payments</h3><p className="mt-1">Subject to verification. RBI guidelines apply. Refunds per our Refund Policy.</p></section>
        <section><h3 className="font-semibold">4. Limitation of Liability</h3><p className="mt-1">As per Consumer Protection Act, 2019. We are not liable for indirect or consequential damages.</p></section>
        <section><h3 className="font-semibold">5. Governing Law</h3><p className="mt-1">Governed by laws of India. Disputes subject to courts in India. Use our Grievance Redressal per IT Rules.</p></section>
      </div>
    )
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "Compliant with DPDP Act, 2023 & IT Act.",
    content: (
      <div className="space-y-4 text-sm text-navy-300">
        <section><h3 className="font-semibold text-primary">Corporate</h3><p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1">IQ Earners is part of <ParentCompanyMark />. References to &quot;we&quot; or &quot;us&quot; include the platform and its parent company where applicable.</p></section>
        <section><h3 className="font-semibold text-primary">1. Data Fiduciary</h3><p className="mt-1">IQ Earners processes data per Digital Personal Data Protection Act, 2023.</p></section>
        <section><h3 className="font-semibold">2. Data Collected</h3><p className="mt-1">Username, quiz performance, session data. Payment details not stored on our servers.</p></section>
        <section><h3 className="font-semibold">3. Your Rights (DPDP Act)</h3><p className="mt-1">Access, correct, erase, withdraw consent. Contact iqearnersteam@gmail.com.</p></section>
        <section><h3 className="font-semibold">4. Security</h3><p className="mt-1">Reasonable security per IT (Reasonable Security Practices) Rules, 2011.</p></section>
      </div>
    )
  },
  rules: {
    title: "Rules & Regulations",
    subtitle: "Indian law compliance. Fair play required.",
    content: (
      <div className="space-y-4 text-sm text-navy-300">
        <section><h3 className="font-semibold text-primary">Do&apos;s</h3><ul className="mt-1 list-disc pl-4 space-y-0.5"> <li>One account per person</li><li>Provide accurate info</li><li>Fair play, no cheating</li><li>Report bugs to support</li></ul></section>
        <section><h3 className="font-semibold text-red-400">Don&apos;ts</h3><ul className="mt-1 list-disc pl-4 space-y-0.5"> <li>No bots or scripts</li><li>No multiple accounts</li><li>No sharing answers</li><li>No abusive content</li></ul></section>
        <section><h3 className="font-semibold">Compliance</h3><p className="mt-1">IT Act 2000, DPDP Act 2023, Consumer Protection Act 2019, Indian Penal Code, RBI guidelines.</p></section>
      </div>
    )
  },
  grievance: {
    title: "Grievance Redressal",
    subtitle: "IT (Intermediary Guidelines) Rules, 2021",
    content: (
      <div className="space-y-4 text-sm text-navy-300">
        <section><h3 className="font-semibold text-primary">Grievance Officer</h3><div className="mt-2 rounded bg-navy-800 p-3"><p>Email: iqearnersteam@gmail.com</p><p className="mt-1">Response: Within 24 hours</p></div></section>
        <section><h3 className="font-semibold">How to Lodge</h3><p className="mt-1">Email with subject line, username, details. Acknowledged in 24h, resolved within 15 days.</p></section>
        <section><h3 className="font-semibold">DPDP Complaints</h3><p className="mt-1">Data access, correction, erasure requests processed as per DPDP Act, 2023.</p></section>
      </div>
    )
  },
  refund: {
    title: "Refund & Cancellation",
    subtitle: "Consumer Protection Act, 2019",
    content: (
      <div className="space-y-4 text-sm text-navy-300">
        <section><h3 className="font-semibold text-primary">Refund Cases</h3><ul className="mt-1 list-disc pl-4 space-y-0.5"><li>Technical failure by platform</li><li>Duplicate/erroneous charge</li><li>Tournament cancelled by us</li><li>Per consumer protection laws</li></ul></section>
        <section><h3 className="font-semibold">How to Request</h3><p className="mt-1">Email iqearnersteam@gmail.com with transaction details. Response in 3–5 business days.</p></section>
      </div>
    )
  },
  disclaimer: {
    title: "Disclaimer",
    content: (
      <div className="space-y-4 text-sm text-navy-300">
        <section><h3 className="font-semibold text-primary">General</h3><p className="mt-1">Platform provided &quot;as is&quot;. Content for entertainment/education. No warranties.</p></section>
        <section><h3 className="font-semibold">Skill-Based</h3><p className="mt-1">Quizzes are skill-based. Participation at your own risk. No professional advice.</p></section>
      </div>
    )
  },
  cookie: {
    title: "Cookie Policy",
    subtitle: "DPDP Act, 2023 compliant",
    content: (
      <div className="space-y-4 text-sm text-navy-300">
        <section><h3 className="font-semibold text-primary">Types</h3><p className="mt-1">Essential (session), Functional (preferences), Local Storage (quiz status). Per IT Act & DPDP Act.</p></section>
        <section><h3 className="font-semibold">Your Choice</h3><p className="mt-1">Disable via browser settings. Essential cookies required for platform use.</p></section>
      </div>
    )
  }
}

export default function LegalModal({ type, onClose }: { type: DocType; onClose: () => void }) {
  const doc = DOCS[type]
  const contentRef = useModalA11y(true, onClose)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="legal-modal-title">
      <div
        ref={contentRef}
        className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-black/90 border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 id="legal-modal-title" className="text-lg font-bold text-primary">{doc.title}</h2>
          <button onClick={onClose} className="rounded p-2 hover:bg-white/10 transition-colors" aria-label="Close">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {doc.subtitle && <p className="text-xs text-navy-400 mb-4">{doc.subtitle}</p>}
          {doc.content}
        </div>
      </div>
    </div>
  )
}

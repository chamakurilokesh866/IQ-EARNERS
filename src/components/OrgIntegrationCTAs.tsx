import { SUPPORT_EMAIL } from "@/lib/seo"

/**
 * Pill CTAs for organization access & API integration (mailto team inbox).
 */
export default function OrgIntegrationCTAs({ className = "" }: { className?: string }) {
  const enc = (s: string) => encodeURIComponent(s)
  return (
    <div className={`flex flex-col sm:flex-row flex-wrap gap-3 ${className}`.trim()}>
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${enc("Request: Organization access")}`}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 active:scale-[0.99]"
      >
        Request organization access
      </a>
      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${enc("Contact: API integration")}`}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/40 bg-transparent px-5 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white transition-all hover:bg-white/10 active:scale-[0.99]"
      >
        Contact for API integration
      </a>
    </div>
  )
}

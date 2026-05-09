import PaidGate from "../../components/PaidGate"
import TransitionLink from "../../components/TransitionLink"
import OrgIntegrationCTAs from "../../components/OrgIntegrationCTAs"
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/seo"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06060c]/92 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <TransitionLink href="/home" className="text-[11px] font-bold text-white/60 hover:text-white">
            ← {SITE_NAME}
          </TransitionLink>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Support</span>
        </div>
      </header>
      <PaidGate>
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-4xl font-extrabold">More</h1>
          <p className="mt-2 text-navy-300">Explore upcoming features, FAQs, and support.</p>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="card p-5">
              <div className="font-semibold">Upcoming Features</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-navy-300">
                <li>Team tournaments</li>
                <li>Custom categories</li>
                <li>Advanced analytics</li>
              </ul>
            </div>
            <div className="card p-5">
              <div className="font-semibold">FAQs</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-navy-300">
                <li>How to join a tournament?</li>
                <li>How prizes are distributed?</li>
                <li>What is the scoring system?</li>
              </ul>
            </div>
            <div className="card p-5">
              <div className="font-semibold">Support</div>
              <p className="mt-2 text-sm text-navy-300">
                Contact{" "}
                <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </div>
          <div className="mt-8">
            <div className="text-xl font-semibold">Dashboard</div>
            <div className="mt-4">
              <TransitionLink href="/user" className="card p-6 block">
                <div className="font-semibold">User Dashboard</div>
                <p className="mt-2 text-sm text-navy-300">View your performance analytics, actions, and recent activity.</p>
                <span className="mt-4 inline-block pill bg-primary">Open</span>
              </TransitionLink>
            </div>
          </div>
          <div id="org-integration" className="mt-8 scroll-mt-24">
            <div className="text-xl font-semibold">Organization Integration</div>
            <p className="mt-2 max-w-2xl text-sm text-navy-400 leading-relaxed">
              Request org portal access or API integration by email — we use focused mail threads instead of sponsorship forms here.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <OrgIntegrationCTAs />
              <TransitionLink href="/more/api-guide" className="card p-6 block">
                <div className="font-semibold">API Key Setup Guide</div>
                <p className="mt-2 text-sm text-navy-300">For schools and partners: org portal login, API keys (owner/admin), org REST routes, Bearer format, webhooks note, and security checklist.</p>
                <span className="mt-4 inline-block pill bg-primary">Open Guide</span>
              </TransitionLink>
            </div>
          </div>
        </section>
      </PaidGate>
    </main>
  )
}

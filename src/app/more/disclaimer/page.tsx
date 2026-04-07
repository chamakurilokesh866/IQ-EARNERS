"use client"

import Navbar from "../../../components/Navbar"
import TransitionLink from "../../../components/TransitionLink"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl font-bold">Disclaimer</h1>
        <p className="mt-3 text-sm text-navy-300">IQ Earners is offered under <strong>{PARENT_COMPANY_NAME}</strong>.</p>

        <div className="mt-8 card p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">General</h2>
            <p className="mt-2 text-sm text-navy-300">
              IQ Earners is provided as is without warranties of any kind. The content, including quiz questions and answers, is for entertainment and educational purposes. We do not guarantee accuracy, completeness, or suitability for any particular purpose.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">No Professional Advice</h2>
            <p className="mt-2 text-sm text-navy-300">
              Nothing on this platform constitutes legal, financial, or professional advice. Use your own judgment and consult qualified professionals when needed.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Third-Party Links and Services</h2>
            <p className="mt-2 text-sm text-navy-300">
              Our platform may contain links to third-party websites or use third-party payment processors. We are not responsible for their content, practices, or policies.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Skill-Based Gaming</h2>
            <p className="mt-2 text-sm text-navy-300">
              Our quizzes and tournaments are skill-based. Participation is at your own risk. Results depend on your performance and are not guaranteed.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <TransitionLink href="/more/terms" className="pill bg-primary">Terms of Service</TransitionLink>
            <TransitionLink href="/more/privacy" className="pill bg-navy-700">Privacy Policy</TransitionLink>
            <TransitionLink href="/home" className="pill bg-navy-700">Back to Home</TransitionLink>
          </div>
        </div>
      </section>
    </main>
  )
}

"use client"

import Navbar from "../../../components/Navbar"
import TransitionLink from "../../../components/TransitionLink"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-navy-400">Last updated: February 2026. Governed by Indian law.</p>
        <p className="mt-3 text-sm text-navy-300">IQ Earners is offered under the parent company <strong>{PARENT_COMPANY_NAME}</strong>.</p>

        <div className="mt-8 card p-6 space-y-6 text-sm text-navy-300">
          <div>
            <h2 className="text-xl font-semibold text-primary">1. Acceptance</h2>
            <p className="mt-2">By accessing or using IQ Earners, you agree to these Terms of Service, our Privacy Policy, Rules & Regulations, and applicable Indian laws including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">2. Eligibility</h2>
            <p className="mt-2">You must be at least 18 years of age and legally capable of entering into a binding contract. By using the platform, you represent that you meet these requirements and comply with applicable laws in India.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">3. Account and Fair Play</h2>
            <p className="mt-2">You are responsible for maintaining the confidentiality of your account. One account per person. Fair play is mandatory. Cheating, bots, multiple accounts, or any unfair means will result in disqualification and account termination.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">4. Prizes and Payments</h2>
            <p className="mt-2">Prizes and payouts are subject to verification. Any fraudulent behavior results in disqualification and forfeiture. Payment processing is subject to Reserve Bank of India guidelines where applicable. Refunds are governed by our Refund & Cancellation Policy.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">5. Content and Conduct</h2>
            <p className="mt-2">You may not post offensive, defamatory, or illegal content. You agree to comply with the Indian Penal Code and other applicable laws. We reserve the right to remove content and suspend accounts for violations.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">6. Intellectual Property</h2>
            <p className="mt-2">All content, trademarks, and materials on IQ Earners are owned by us or our licensors. You may not copy, modify, or distribute them without prior written consent.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">7. Limitation of Liability</h2>
            <p className="mt-2">To the fullest extent permitted by law, we shall not be liable for indirect, incidental, or consequential damages. Our liability is limited as per the Consumer Protection Act, 2019 and applicable laws.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">8. Governing Law and Dispute Resolution</h2>
            <p className="mt-2">These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India. You may also use our Grievance Redressal mechanism as per the IT Rules.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">9. Changes</h2>
            <p className="mt-2">We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance. Material changes will be communicated via the platform or email where appropriate.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">10. Contact</h2>
            <p className="mt-2">For questions or support, contact iqearnersteam@gmail.com. For grievances, contact our Grievance Redressal Officer at iqearnersteam@gmail.com.</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-navy-700">
            <TransitionLink href="/more/privacy" className="pill bg-primary">Privacy Policy</TransitionLink>
            <TransitionLink href="/more/rules" className="pill bg-navy-700">Rules & Regulations</TransitionLink>
            <TransitionLink href="/more/grievance" className="pill bg-navy-700">Grievance Redressal</TransitionLink>
            <TransitionLink href="/more/refund" className="pill bg-navy-700">Refund Policy</TransitionLink>
            <TransitionLink href="/home" className="pill bg-navy-700">Back to Home</TransitionLink>
          </div>
        </div>
      </section>
    </main>
  )
}

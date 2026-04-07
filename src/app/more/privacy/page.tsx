"use client"

import Navbar from "../../../components/Navbar"
import TransitionLink from "../../../components/TransitionLink"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-navy-400">Last updated: February 2026. Compliant with the Digital Personal Data Protection Act, 2023 (DPDP Act) and IT Act.</p>
        <p className="mt-3 text-sm text-navy-300">IQ Earners is part of <strong>{PARENT_COMPANY_NAME}</strong>. References to &quot;we&quot; or &quot;us&quot; include the platform and its parent company where applicable.</p>

        <div className="mt-8 card p-6 space-y-6 text-sm text-navy-300">
          <div>
            <h2 className="text-xl font-semibold text-primary">1. Data Controller</h2>
            <p className="mt-2">IQ Earners is the Data Fiduciary for the purposes of the Digital Personal Data Protection Act, 2023. We process your personal data in accordance with applicable Indian law.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">2. Data We Collect</h2>
            <p className="mt-2">We collect minimal data necessary to run the platform:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Account information: username, email (where provided), profile data</li>
              <li>Quiz and tournament performance: scores, completion status</li>
              <li>Technical data: session cookies, IP address (for security)</li>
              <li>Local storage: quiz completion status stored in your browser</li>
            </ul>
            <p className="mt-2">Payment details are processed by our payment provider and are not stored on our servers.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">3. Purpose of Processing</h2>
            <p className="mt-2">We use your data to provide the quiz and tournament services, maintain leaderboards, process payments (where applicable), improve our services, and comply with legal obligations.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">4. Consent</h2>
            <p className="mt-2">By using the platform, you consent to the collection and processing of your data as described in this policy. For certain processing activities, we may seek additional consent where required under the DPDP Act.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">5. Your Rights (DPDP Act)</h2>
            <p className="mt-2">Under the Digital Personal Data Protection Act, 2023, you have the right to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Access your personal data</li>
              <li>Correct or update inaccurate data</li>
              <li>Request erasure of your data</li>
              <li>Withdraw consent (subject to legal retention requirements)</li>
              <li>Nominate a representative for your data</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact our Grievance Redressal Officer at iqearnersteam@gmail.com or request data export/deletion via iqearnersteam@gmail.com.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">6. Data Retention</h2>
            <p className="mt-2">We retain your data only for as long as necessary to provide our services and comply with legal obligations (e.g., financial records as per applicable laws).</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">7. Security</h2>
            <p className="mt-2">We implement reasonable security practices as required under the Information Technology (Reasonable Security Practices) Rules, 2011 to protect your data from unauthorized access, alteration, or disclosure.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">8. Third Parties</h2>
            <p className="mt-2">We may share data with payment processors, analytics providers, or as required by law. Such processors are bound by appropriate confidentiality and security obligations.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">9. Cookies</h2>
            <p className="mt-2">We use cookies and local storage for essential functionality, session management, and preferences. See our Cookie Policy for details.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">10. Notifications</h2>
            <p className="mt-2">We may send browser or push notifications for quiz reminders and updates. You can disable these at any time through your device or browser settings.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">11. Grievances</h2>
            <p className="mt-2">For privacy-related complaints, contact our Grievance Redressal Officer at iqearnersteam@gmail.com. We will respond as per the IT (Intermediary Guidelines) Rules and DPDP Act.</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-navy-700">
            <TransitionLink href="/more/terms" className="pill bg-primary">Terms of Service</TransitionLink>
            <TransitionLink href="/more/cookie-policy" className="pill bg-navy-700">Cookie Policy</TransitionLink>
            <TransitionLink href="/more/grievance" className="pill bg-navy-700">Grievance Redressal</TransitionLink>
            <TransitionLink href="/more/rules" className="pill bg-navy-700">Rules</TransitionLink>
            <TransitionLink href="/home" className="pill bg-navy-700">Back to Home</TransitionLink>
          </div>
        </div>
      </section>
    </main>
  )
}

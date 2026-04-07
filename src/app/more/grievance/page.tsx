"use client"

import Navbar from "../../../components/Navbar"
import TransitionLink from "../../../components/TransitionLink"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl font-bold">Grievance Redressal</h1>
        <p className="mt-2 text-navy-400">
          In compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021
        </p>
        <p className="mt-3 text-sm text-navy-300">Platform parent company: <strong>{PARENT_COMPANY_NAME}</strong>.</p>

        <div className="mt-8 card p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">Grievance Redressal Officer</h2>
            <p className="mt-2 text-sm text-navy-300">
              For any complaints, concerns, or grievances relating to the platform, content, or your data, please contact our designated Grievance Redressal Officer:
            </p>
            <div className="mt-4 rounded-lg bg-navy-800 p-4 text-sm">
              <p><strong>Name:</strong> Grievance Redressal Officer</p>
              <p className="mt-1"><strong>Email:</strong> iqearnersteam@gmail.com</p>
              <p className="mt-1"><strong>Response time:</strong> Within 24 hours</p>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">How to Lodge a Grievance</h2>
            <ul className="mt-2 text-sm text-navy-300 list-disc pl-5 space-y-1">
              <li>Send an email to the address above with a clear subject line</li>
              <li>Include your registered email or username and contact details</li>
              <li>Describe the issue with relevant details (dates, screenshots if applicable)</li>
              <li>We will acknowledge within 24 hours and aim to resolve within 15 days</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Data and Privacy Complaints</h2>
            <p className="mt-2 text-sm text-navy-300">
              For complaints related to personal data, data access, correction, or erasure under the Digital Personal Data Protection Act, 2023, please contact the above officer. We will process such requests as per applicable law.
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

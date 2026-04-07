"use client"

import Navbar from "../../../components/Navbar"
import TransitionLink from "../../../components/TransitionLink"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl font-bold">Rules & Regulations</h1>
        <p className="mt-2 text-navy-400">IQ Earners is operated in compliance with applicable Indian laws.</p>
        <p className="mt-3 text-sm text-navy-300">Parent company: <strong>{PARENT_COMPANY_NAME}</strong>.</p>

        <div className="mt-8 space-y-8">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-primary">Do&apos;s</h2>
            <ul className="mt-3 space-y-2 text-sm text-navy-300 list-disc pl-5">
              <li>Play fairly using a single account per person</li>
              <li>Provide accurate and truthful information during registration</li>
              <li>Respect other players and maintain sportsmanship</li>
              <li>Complete quizzes within the allotted time</li>
              <li>Report bugs, errors, or suspicious activity to support</li>
              <li>Read and accept our Terms of Service and Privacy Policy before use</li>
              <li>Use the platform only for lawful purposes</li>
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold text-red-400">Don&apos;ts</h2>
            <ul className="mt-3 space-y-2 text-sm text-navy-300 list-disc pl-5">
              <li>Do not use bots, scripts, or automated tools to participate</li>
              <li>Do not create multiple accounts or impersonate others</li>
              <li>Do not share answers or collude during timed quizzes</li>
              <li>Do not use abusive language, harassment, or hate speech</li>
              <li>Do not attempt to circumvent platform restrictions or security</li>
              <li>Do not reverse-engineer, scrape, or misuse the platform</li>
              <li>Do not engage in any activity prohibited under Indian law</li>
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold">Indian Law Compliance</h2>
            <p className="mt-2 text-sm text-navy-300">
              IQ Earners operates as a skill-based platform. Participation is subject to compliance with:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-navy-300 list-disc pl-5">
              <li>Information Technology Act, 2000 and rules thereunder</li>
              <li>Digital Personal Data Protection Act, 2023</li>
              <li>Consumer Protection Act, 2019</li>
              <li>Indian Penal Code and applicable state laws</li>
              <li>Reserve Bank of India guidelines (where applicable to payments)</li>
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold">Consequences of Violation</h2>
            <p className="mt-2 text-sm text-navy-300">
              Violation of these rules may result in disqualification, account suspension, forfeiture of prizes, and reporting to appropriate authorities where required by law.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <TransitionLink href="/more/terms" className="pill bg-primary">Terms of Service</TransitionLink>
            <TransitionLink href="/more/privacy" className="pill bg-navy-700">Privacy Policy</TransitionLink>
            <TransitionLink href="/more/grievance" className="pill bg-navy-700">Grievance Redressal</TransitionLink>
            <TransitionLink href="/home" className="pill bg-navy-700">Back to Home</TransitionLink>
          </div>
        </div>
      </section>
    </main>
  )
}

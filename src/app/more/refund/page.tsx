"use client"

import Navbar from "../../../components/Navbar"
import TransitionLink from "../../../components/TransitionLink"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl font-bold">Refund & Cancellation Policy</h1>
        <p className="mt-2 text-navy-400">In compliance with the Consumer Protection Act, 2019 and e-commerce guidelines</p>
        <p className="mt-3 text-sm text-navy-300">IQ Earners is offered under <strong>{PARENT_COMPANY_NAME}</strong>.</p>

        <div className="mt-8 card p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">Refund Policy</h2>
            <p className="mt-2 text-sm text-navy-300">
              IQ Earners offers skill-based quizzes and tournaments. Payments for tournament entry or premium features are generally non-refundable once participation has commenced. Refunds may be considered in the following cases:
            </p>
            <ul className="mt-3 text-sm text-navy-300 list-disc pl-5 space-y-1">
              <li>Technical failure attributable to the platform preventing completion of the quiz/tournament</li>
              <li>Duplicate or erroneous charge</li>
              <li>Cancellation of a tournament by us before it begins</li>
              <li>As required under applicable consumer protection laws</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Cancellation</h2>
            <p className="mt-2 text-sm text-navy-300">
              Cancellation of participation before a tournament starts may be eligible for a refund or credit at our discretion. No refunds will be issued for completed quizzes or tournaments.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">How to Request a Refund</h2>
            <p className="mt-2 text-sm text-navy-300">
              Contact our Grievance Redressal Officer at iqearnersteam@gmail.com with your transaction details and reason for the refund request. We will respond within 3–5 business days.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <TransitionLink href="/more/grievance" className="pill bg-primary">Grievance Redressal</TransitionLink>
            <TransitionLink href="/more/terms" className="pill bg-navy-700">Terms of Service</TransitionLink>
            <TransitionLink href="/home" className="pill bg-navy-700">Back to Home</TransitionLink>
          </div>
        </div>
      </section>
    </main>
  )
}

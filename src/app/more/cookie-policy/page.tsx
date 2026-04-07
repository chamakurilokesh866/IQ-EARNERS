"use client"

import Navbar from "../../../components/Navbar"
import TransitionLink from "../../../components/TransitionLink"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function Page() {
  return (
    <main className="min-h-screen app-page-surface">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl font-bold">Cookie Policy</h1>
        <p className="mt-2 text-navy-400">Last updated: February 2026</p>
        <p className="mt-3 text-sm text-navy-300">This policy applies to IQ Earners, offered under <strong>{PARENT_COMPANY_NAME}</strong>.</p>

        <div className="mt-8 card p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">What Are Cookies</h2>
            <p className="mt-2 text-sm text-navy-300">
              Cookies are small text files stored on your device when you visit our website. They help us provide a better experience, remember your preferences, and keep you logged in.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Types of Cookies We Use</h2>
            <ul className="mt-2 text-sm text-navy-300 list-disc pl-5 space-y-1">
              <li><strong>Essential:</strong> Required for the site to function (e.g., session, authentication)</li>
              <li><strong>Functional:</strong> Remember your preferences (e.g., language)</li>
              <li><strong>Local Storage:</strong> Used for quiz completion status and similar data (stored in your browser)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Your Choice</h2>
            <p className="mt-2 text-sm text-navy-300">
              You can disable or delete cookies through your browser settings. Note that disabling essential cookies may affect your ability to use the platform.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Indian Law</h2>
            <p className="mt-2 text-sm text-navy-300">
              Our use of cookies complies with the Information Technology Act and the Digital Personal Data Protection Act, 2023. We collect only what is necessary for the services we provide.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <TransitionLink href="/more/privacy" className="pill bg-primary">Privacy Policy</TransitionLink>
            <TransitionLink href="/more/terms" className="pill bg-navy-700">Terms of Service</TransitionLink>
            <TransitionLink href="/home" className="pill bg-navy-700">Back to Home</TransitionLink>
          </div>
        </div>
      </section>
    </main>
  )
}

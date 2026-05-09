"use client"

import { useParams } from "next/navigation"
import Link from "next/link"

/**
 * Legacy gate: org sign-in requires the per-organization portal URL
 * (/org/{slug}/portal/{portalCode}/login) issued by the platform admin.
 */
export default function OrgLoginGatePage() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="min-h-screen app-page-surface flex flex-col items-center justify-center px-6 text-center text-white">
      <div className="text-5xl mb-4">🔐</div>
      <h1 className="text-2xl font-black tracking-tight mb-2">Secure portal access</h1>
      <p className="text-white/55 text-sm max-w-md leading-relaxed mb-2">
        Organization sign-in uses a unique link for <span className="text-cyan-300 font-mono">{slug}</span>. Open the URL sent by your administrator (it includes a private portal code).
        Your session ends when you close the browser.
      </p>
      <p className="text-white/40 text-xs max-w-md mb-8">If you lost the link, contact your org owner or IQ Earners support.</p>
      <Link href="/intro" className="text-sm font-bold text-cyan-400 hover:underline">
        Back to IQ Earners
      </Link>
    </div>
  )
}

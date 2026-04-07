"use client"

import Link from "next/link"
import Image from "next/image"
import logoPng from "../app/prizes/icon.png"
import FooterBanner from "./FooterBanner"
import { PARENT_COMPANY_NAME } from "@/lib/seo"

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#04060c] w-full text-white">
      <FooterBanner />
      <div className="mx-auto max-w-7xl w-full px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm mb-8 border-b pb-6 text-white/40 border-white/5">
          <Image
            src={logoPng}
            alt="IQ Earners logo"
            className="h-6 w-6 rounded-full object-contain p-[1px] border bg-white/5 border-white/10"
          />
          <span className="font-semibold text-white/90">© 2026 IQ Earners</span>
          <span className="text-xs sm:text-sm text-white/50" aria-hidden>
            ·
          </span>
          <span className="text-xs sm:text-sm uppercase tracking-wider text-white/55">
            Parent company: {PARENT_COMPANY_NAME}
          </span>
          <Link href="/intro?msg=contact" className="hover:text-primary transition-colors !text-white/60">
            Contact Us
          </Link>
          <Link href="/intro?legal=terms" className="hover:text-primary transition-colors !text-white/60">
            Terms
          </Link>
          <Link href="/intro?legal=privacy" className="hover:text-primary transition-colors !text-white/60">
            Privacy
          </Link>
          <Link href="/intro?legal=rules" className="hover:text-primary transition-colors !text-white/60">
            Rules
          </Link>
          <Link href="/intro?legal=grievance" className="hover:text-primary transition-colors !text-white/60">
            Grievance
          </Link>
          <Link href="/intro?legal=refund" className="hover:text-primary transition-colors !text-white/60">
            Refund
          </Link>
          <Link href="/intro?legal=disclaimer" className="hover:text-primary transition-colors !text-white/60">
            Disclaimer
          </Link>
          <Link href="/intro?legal=cookie" className="hover:text-primary transition-colors !text-white/60">
            Cookies
          </Link>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-10 px-6 py-4 rounded-2xl border bg-white/[0.02] border-white/[0.05]">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45">Secure Payments</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45">IT Act Compliance</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45">DPDP Protected</div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/45">Consumer Certified</div>
          </div>

          <p className="max-w-2xl text-center text-[9px] sm:text-[10px] leading-relaxed px-4 uppercase tracking-wider font-medium text-white/50">
            IQ EARNERS IS A SKILL-BASED KNOWLEDGE PLATFORM (PARENT COMPANY: {PARENT_COMPANY_NAME.toUpperCase()}) OPERATING UNDER IT ACT 2000, DPDP 2023, AND CONSUMER PROTECTION ACT 2019. ALL TRANSACTIONS ARE SECURED VIA RBI MANDATED GATEWAYS.
          </p>

          <div className="text-[9px] uppercase tracking-[0.3em] mt-4 font-bold text-white/35">
            Skill-based engagement • 18+ Only • Play Responsibly
          </div>
        </div>
      </div>
    </footer>
  )
}

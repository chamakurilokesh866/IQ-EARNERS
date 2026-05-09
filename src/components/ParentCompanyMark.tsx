"use client"

import { PARENT_COMPANY_NAME } from "@/lib/seo"

type Props = {
  className?: string
  /** Default: elegant gradient wordmark. `legalStamp`: tighter tracking for all-caps disclaimers. */
  variant?: "wordmark" | "legalStamp"
}

/**
 * Distinct presentation for the parent company name (SynKora) — display serif + gradient.
 * Relies on `--font-display` (Playfair Display) from root layout.
 */
export default function ParentCompanyMark({ className = "", variant = "wordmark" }: Props) {
  const base =
    variant === "legalStamp"
      ? "font-[family-name:var(--font-display)] inline font-semibold not-italic tracking-[0.18em] bg-gradient-to-r from-violet-200 via-fuchsia-200 to-sky-200 bg-clip-text text-transparent"
      : "font-[family-name:var(--font-display)] inline-block font-bold italic tracking-[0.12em] bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(167,139,250,0.22)]"

  const label = variant === "legalStamp" ? PARENT_COMPANY_NAME.toUpperCase() : PARENT_COMPANY_NAME

  return (
    <span className={`${base} ${className}`.trim()} translate="no">
      {label}
    </span>
  )
}

"use client"

/** Fixed (not in document flow) — does not reserve layout space. */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-0 z-[201] -translate-y-[120%] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white opacity-0 shadow-lg outline-none ring-2 ring-white transition-none focus:translate-y-4 focus:opacity-100"
    >
      Skip to main content
    </a>
  )
}

"use client"

/**
 * Horizontal in-page anchors for long admin tabs (Payments, Settings).
 */
export type JumpLink = { id: string; label: string }

export function AdminTabJumpNav({ links, ariaLabel }: { links: JumpLink[]; ariaLabel: string }) {
  return (
    <nav
      className="admin-card p-3 sm:p-4 mb-6 border-primary/10"
      aria-label={ariaLabel}
    >
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-primary/50 mb-2">On this page</div>
      <div className="flex flex-wrap gap-1.5">
        {links.map((l) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-white/80 hover:border-primary/30 hover:bg-primary/10 hover:text-mint transition-colors scroll-mt-24"
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

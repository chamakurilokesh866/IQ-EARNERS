"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type Ref,
} from "react"
import ParentCompanyMark from "@/components/ParentCompanyMark"
import type { AdminStatsSnapshot } from "@/components/admin/DashboardOverview"
import {
  ADMIN_NAV_ITEMS,
  HEADER_QUICK_TABS,
  LS_ADMIN_SECTIONS,
  LS_SIDEBAR_COMPACT,
  NAV_SECTIONS_ORDER,
  SECTION_HEADING,
  type AdminTab,
  type NavSection,
} from "@/components/admin/AdminNavConfig"

type NavItem = (typeof ADMIN_NAV_ITEMS)[number]

export type AdminWorkspaceShellProps = {
  sidebarCompact: boolean
  setSidebarCompact: (v: boolean) => void
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (v: boolean | ((b: boolean) => boolean)) => void
  searchQuery: string
  setSearchQuery: (s: string) => void
  searchRef: Ref<HTMLInputElement>
  tab: AdminTab
  navigateToTab: (t: AdminTab) => void
  sidebarNavOrdered: NavItem[]
  pendingCount: number
  blockedCount: number
  stats: AdminStatsSnapshot | null
  lastRefresh: Date | null
  statsError: string | null
  statsRefreshing: boolean
  clock: string
  currentNavItem: NavItem | undefined
  onRefreshStats: () => void | Promise<void>
  onCopyContext: () => void
  /** True when opened as installed PWA / iOS home screen — hides install UI */
  isStandaloneAdminApp?: boolean
  canInstallAdminApp?: boolean
  onInstallAdminApp?: () => void
  isOffline?: boolean
  children: ReactNode
}

function loadCollapsed(): Set<NavSection> {
  try {
    const raw = localStorage.getItem(LS_ADMIN_SECTIONS)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(arr as NavSection[])
  } catch {
    return new Set()
  }
}

function saveCollapsed(s: Set<NavSection>) {
  try {
    localStorage.setItem(LS_ADMIN_SECTIONS, JSON.stringify([...s]))
  } catch {
    /* ignore */
  }
}

function subscribeMobileNav(cb: () => void) {
  const mq = window.matchMedia("(max-width: 1023px)")
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

function snapshotMobileNav() {
  return window.matchMedia("(max-width: 1023px)").matches
}

function useIsMobileNavBreakpoint() {
  return useSyncExternalStore(subscribeMobileNav, snapshotMobileNav, () => false)
}

export default function AdminWorkspaceShell({
  sidebarCompact,
  setSidebarCompact,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  searchQuery,
  setSearchQuery,
  searchRef,
  tab,
  navigateToTab,
  sidebarNavOrdered,
  pendingCount,
  blockedCount,
  stats,
  lastRefresh,
  statsError,
  statsRefreshing,
  clock,
  currentNavItem,
  onRefreshStats,
  onCopyContext,
  isStandaloneAdminApp = false,
  canInstallAdminApp = false,
  onInstallAdminApp,
  isOffline = false,
  children,
}: AdminWorkspaceShellProps) {
  const isMobileNav = useIsMobileNavBreakpoint()
  const [collapsed, setCollapsed] = useState<Set<NavSection>>(() =>
    typeof window === "undefined" ? new Set() : loadCollapsed()
  )

  useEffect(() => {
    setCollapsed(loadCollapsed())
  }, [])

  const toggleSection = useCallback((section: NavSection) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      saveCollapsed(next)
      return next
    })
  }, [])

  const itemsBySection = useMemo(() => {
    const m = new Map<NavSection, NavItem[]>()
    for (const s of NAV_SECTIONS_ORDER) m.set(s, [])
    for (const n of sidebarNavOrdered) {
      const list = m.get(n.section) ?? []
      list.push(n)
      m.set(n.section, list)
    }
    return m
  }, [sidebarNavOrdered])

  const toggleSidebarCompact = useCallback(() => {
    const next = !sidebarCompact
    setSidebarCompact(next)
    try {
      localStorage.setItem(LS_SIDEBAR_COMPACT, next ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [sidebarCompact, setSidebarCompact])

  return (
    <main
      className={`admin-layout admin-workspace-main min-h-screen text-slate-200 font-sans selection:bg-primary/30${
        sidebarCompact ? " admin-sidebar-compact" : ""
      }`}
    >
      {isMobileMenuOpen && (
        <button
          type="button"
          className="admin-mobile-backdrop lg:hidden border-0 cursor-pointer"
          aria-label="Close menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky inset-y-0 left-0 z-[100] max-lg:w-[min(calc(100vw-10px),28rem)] w-[min(100vw-2rem,300px)] flex flex-col min-h-0 overflow-hidden border-r border-primary/10 bg-[var(--admin-sidebar-bg)] backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out max-lg:pt-[env(safe-area-inset-top)] lg:translate-x-0 lg:h-full lg:max-h-screen ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.05] to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay"
          style={{
            backgroundImage: "url(/noise.svg)",
            backgroundSize: "200px 200px",
            backgroundRepeat: "repeat",
          }}
          aria-hidden
        />

        <div className="relative z-[2] p-3.5 border-b border-white/5 shrink-0">
          <div className={`flex items-center gap-2.5 mb-3 ${sidebarCompact ? "lg:flex-col lg:items-center lg:gap-2" : ""}`}>
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-primary/30">
              IQ
            </div>
            <div className={`min-w-0 flex-1 ${sidebarCompact ? "lg:hidden" : ""}`}>
              <div className="font-black text-sm text-white tracking-tight leading-tight">Command Center</div>
              <div className="text-[9px] text-accent/90 uppercase tracking-[0.16em] font-bold leading-snug flex flex-wrap items-center gap-x-1">
                <span>Live ops ·</span> <ParentCompanyMark className="!normal-case text-[11px]" />
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSidebarCompact}
              className="hidden lg:flex shrink-0 w-9 h-9 items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 text-white/70 hover:text-white hover:border-primary/25 text-sm font-bold transition-all"
              aria-label={sidebarCompact ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCompact ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCompact ? "»" : "«"}
            </button>
          </div>
          <Link
            href="/home"
            title="App home"
            className={`flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-2.5 py-2 text-[11px] font-bold text-white/90 hover:bg-white/10 hover:border-primary/20 transition-all ${
              sidebarCompact ? "lg:px-2" : ""
            }`}
          >
            <span className={sidebarCompact ? "max-lg:inline lg:sr-only" : ""}>← Public site</span>
            {sidebarCompact ? (
              <span className="hidden lg:inline" aria-hidden>
                ←
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            title="Log out"
            onClick={async () => {
              if (!confirm("Log out of admin?")) return
              await fetch("/api/user/logout", { method: "POST" })
              window.location.replace("/")
            }}
            className={`mt-2 w-full rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold py-2 hover:bg-red-500/15 transition-all ${
              sidebarCompact ? "lg:px-2" : ""
            }`}
          >
            <span className={sidebarCompact ? "max-lg:inline lg:sr-only" : ""}>Log out</span>
            {sidebarCompact ? (
              <span className="hidden lg:inline" aria-hidden>
                ⎋
              </span>
            ) : null}
          </button>
        </div>

        <div className={`relative z-[2] px-3 pt-2 pb-2 border-b border-white/5 shrink-0 ${sidebarCompact ? "lg:hidden" : ""}`}>
          <input
            ref={searchRef}
            type="search"
            placeholder="Jump to section… ⌘K"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/10 pl-2.5 pr-2.5 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
          />
          <p className="mt-1.5 text-[9px] font-medium leading-tight text-white/35">
            {sidebarNavOrdered.length} tools · grouped by domain · URL syncs <code className="text-white/45">?tab=</code>
          </p>
        </div>

        <nav
          className="relative z-[2] flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-2 py-2 scrollbar-thin"
          aria-label="Admin workspace"
        >
          {/* Desktop compact: single column of icons (no section accordions) */}
          <div className={`flex-col gap-0.5 ${sidebarCompact ? "hidden lg:flex" : "hidden"}`}>
            {sidebarNavOrdered.map((n) => (
              <button
                key={n.key}
                type="button"
                title={n.label}
                onClick={() => navigateToTab(n.key)}
                className={`admin-nav-item relative mb-0.5 w-full min-w-0 shrink-0 justify-center gap-0 rounded-lg px-2 text-left ${tab === n.key ? "active" : ""}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold leading-none">
                  {n.icon}
                </span>
                {n.key === "Payments" && pendingCount > 0 && (
                  <span
                    className={`absolute right-1 top-1 flex h-2 min-w-[0.5rem] items-center justify-center rounded p-0 text-[0px] font-black ${
                      tab === n.key ? "bg-slate-900 ring-1 ring-accent" : "bg-amber-500"
                    }`}
                  />
                )}
              </button>
            ))}
          </div>

          <div className={sidebarCompact ? "lg:hidden flex flex-col flex-1 min-h-0" : "flex flex-col flex-1 min-h-0"}>
            {isMobileNav
              ? NAV_SECTIONS_ORDER.map((section) => {
                  const items = itemsBySection.get(section) ?? []
                  if (!items.length) return null
                  return (
                    <div key={section} className="mb-2 last:mb-0">
                      <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white/35">
                        {SECTION_HEADING[section]}
                      </div>
                      {items.map((n) => (
                        <button
                          key={n.key}
                          type="button"
                          title={n.label}
                          onClick={() => navigateToTab(n.key)}
                          className="admin-nav-item relative mb-0.5 w-full min-w-0 shrink-0 rounded-lg py-2.5 text-left min-h-[44px] items-center"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 text-[11px] font-bold leading-none">
                            {n.icon}
                          </span>
                          <span className="min-w-0 flex-1 font-medium leading-snug text-[11px] text-white/90">{n.label}</span>
                          {n.key === "Payments" && pendingCount > 0 && (
                            <span
                              className={`flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded px-0.5 text-[9px] font-black ${
                                tab === n.key ? "bg-slate-900 text-accent" : "bg-amber-500 text-slate-900"
                              }`}
                            >
                              {pendingCount > 99 ? "99+" : pendingCount}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                })
              : NAV_SECTIONS_ORDER.map((section) => {
                  const items = itemsBySection.get(section) ?? []
                  if (!items.length) return null
                  const isCollapsed = collapsed.has(section)
                  return (
                    <div key={section} className="mb-1">
                      <button
                        type="button"
                        onClick={() => toggleSection(section)}
                        className="admin-ws-section-toggle"
                        aria-expanded={!isCollapsed}
                      >
                        <span>{SECTION_HEADING[section]}</span>
                        <span className="admin-ws-chevron" aria-hidden>
                          {isCollapsed ? "▸" : "▾"}
                        </span>
                      </button>
                      {!isCollapsed &&
                        items.map((n) => (
                          <button
                            key={n.key}
                            type="button"
                            title={n.label}
                            onClick={() => navigateToTab(n.key)}
                            className="admin-nav-item relative mb-0.5 w-full min-w-0 shrink-0 rounded-lg text-left"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold leading-none">
                              {n.icon}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium leading-snug text-[10px]">{n.label}</span>
                            {n.key === "Payments" && pendingCount > 0 && (
                              <span
                                className={`flex h-4 min-w-[1rem] shrink-0 items-center justify-center rounded px-0.5 text-[9px] font-black ${
                                  tab === n.key ? "bg-slate-900 text-accent" : "bg-amber-500 text-slate-900"
                                }`}
                              >
                                {pendingCount > 99 ? "99+" : pendingCount}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  )
                })}
          </div>
        </nav>

        {!isStandaloneAdminApp ? (
          <div className="relative z-[2] shrink-0 border-t border-white/10 bg-black/35 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">IQ Admin on your phone</p>
            {canInstallAdminApp && onInstallAdminApp ? (
              <button
                type="button"
                className="w-full rounded-xl bg-gradient-to-r from-primary/90 to-accent/80 py-3 text-xs font-black text-white shadow-lg shadow-primary/20 border border-white/10"
                onClick={() => {
                  onInstallAdminApp()
                }}
              >
                Install Admin App
              </button>
            ) : (
              <div className="space-y-1.5 text-[11px] leading-snug text-white/70">
                <p>
                  <span className="font-bold text-white/90">Chrome / Edge (Android):</span> Menu → Install app or Add to Home
                  screen.
                </p>
                <p>
                  <span className="font-bold text-white/90">Safari (iPhone):</span> Share → Add to Home Screen.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </aside>

      <section className="relative z-[1] flex flex-1 flex-col min-w-0 min-h-0 w-full overflow-hidden bg-[var(--admin-surface)] lg:h-full lg:max-h-screen">
        <div className="lg:hidden flex items-center justify-between gap-2 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] border-b border-white/5 bg-[color-mix(in_srgb,var(--admin-surface)_95%,transparent)] backdrop-blur-md z-[95]">
          <span className="font-black text-white text-xs tracking-wide min-w-0">Admin</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isStandaloneAdminApp && canInstallAdminApp && onInstallAdminApp ? (
              <button
                type="button"
                className="rounded-xl bg-primary/20 border border-primary/35 px-2.5 py-2 text-[10px] font-black text-mint max-[380px]:hidden"
                onClick={() => {
                  void onInstallAdminApp()
                }}
              >
                Install
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/10 border border-white/10 text-white font-bold"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        <header className="shrink-0 z-30 border-b border-white/5 bg-[color-mix(in_srgb,var(--admin-surface)_90%,transparent)] backdrop-blur-md">
          <div className="max-w-[1600px] mx-auto w-full px-3 sm:px-5 py-3 sm:py-4 space-y-3">
            <div
              className={`admin-ws-status-bar ${statsError ? "admin-ws-status-bar--error" : ""}`}
              role="status"
              aria-live="polite"
            >
              {!statsError ? (
                <>
                  <span className="inline-flex items-center gap-2 text-emerald-300/90 normal-case tracking-normal">
                    <span className="admin-ws-pulse" aria-hidden />
                    Live data
                  </span>
                  <span className="text-white/40 normal-case tracking-normal font-mono">
                    {statsRefreshing ? "Syncing…" : lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Waiting…"}
                  </span>
                  <span className="text-white/35 normal-case tracking-normal hidden sm:inline">
                    Auto-refresh ~10s · /api/stats + /api/admin/*
                  </span>
                </>
              ) : (
                <span className="normal-case tracking-normal">{statsError}</span>
              )}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-500 uppercase font-black tracking-widest">
                  <span className="text-white/40">Workspace</span>
                  <span className="text-white/15" aria-hidden>
                    /
                  </span>
                  <span className="text-accent/90">{currentNavItem?.label ?? tab}</span>
                  <span className="text-white/15 hidden sm:inline" aria-hidden>
                    ·
                  </span>
                  <span className="font-mono text-primary/50 normal-case tracking-normal">{clock}</span>
                </div>
                <h1 className="mt-1 text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/25 text-sm">
                    {currentNavItem?.icon ?? "◆"}
                  </span>
                  <span className="truncate">{currentNavItem?.label ?? tab}</span>
                </h1>
              </div>

              <div className="flex flex-col gap-2 lg:items-end">
                <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Quick navigation">
                  {HEADER_QUICK_TABS.map((key) => {
                    const n = ADMIN_NAV_ITEMS.find((i) => i.key === key)!
                    const active = tab === n.key
                    return (
                      <button
                        key={n.key}
                        type="button"
                        title={n.label}
                        onClick={() => navigateToTab(n.key)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold border transition-colors ${
                          active
                            ? "bg-primary/15 border-primary/35 text-mint"
                            : "bg-white/[0.03] border-white/10 text-white/65 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <span className="opacity-80" aria-hidden>
                          {n.icon}
                        </span>
                        {n.label}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isStandaloneAdminApp && canInstallAdminApp && onInstallAdminApp ? (
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost-dark text-xs py-2 px-3"
                      onClick={onInstallAdminApp}
                    >
                      Install Admin App
                    </button>
                  ) : null}
                  <button
                    type="button"
                    id="copy-admin-context-btn"
                    className="admin-btn admin-btn-ghost-dark text-xs py-2 px-3"
                    onClick={onCopyContext}
                  >
                    Copy context
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost-dark text-xs py-2 px-3 disabled:opacity-40"
                    onClick={() => void onRefreshStats()}
                    disabled={statsRefreshing}
                  >
                    {statsRefreshing ? "Refreshing…" : "Refresh data"}
                  </button>
                  <button type="button" className="admin-btn admin-btn-primary text-xs py-2 px-4" onClick={() => navigateToTab("Quizzes")}>
                    + Quiz
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isOffline ? "bg-amber-500/10 border-amber-500/25 text-amber-200" : "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"}`}>
                {isOffline ? "Offline mode" : "Online"}
              </div>
              <button
                type="button"
                onClick={() => navigateToTab("Payments")}
                className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs font-bold text-amber-100/95 hover:bg-amber-500/15 transition-colors"
              >
                Pending payments
                <span className="ml-1.5 tabular-nums text-amber-300">{pendingCount}</span>
              </button>
              <button
                type="button"
                onClick={() => navigateToTab("BlockedUsers")}
                className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-xs font-bold text-white/75 hover:bg-white/[0.07] transition-colors"
              >
                Blocked users
                <span className="ml-1.5 tabular-nums text-white/50">{blockedCount}</span>
              </button>
              <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2 text-xs font-semibold text-white/50">
                <span className="text-white/35">Quizzes</span>{" "}
                <span className="tabular-nums text-white/80">{stats?.quizzesCount ?? "—"}</span>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2 text-xs font-semibold text-white/50">
                <span className="text-white/35">Live events</span>{" "}
                <span className="tabular-nums text-white/80">{stats?.activeTournaments ?? 0}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain admin-main-surface scroll-smooth">
          <div className="p-4 sm:p-6 lg:p-8 mx-auto max-w-[1600px] pb-16">{children}</div>
        </div>
      </section>
    </main>
  )
}

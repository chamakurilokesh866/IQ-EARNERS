"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import {
  Stat,
  OverviewContext,
  RecentActivity,
  RevenueOverviewCard,
  QuestionReportsCard,
  ReferralsOverviewCard,
  type AdminStatsSnapshot,
} from "@/components/admin/DashboardOverview"
import {
  RegisteredUsersCard,
  UsersTable,
  BlockedUsersCard,
  IntegrityEventsCard,
  InspectAlertsCard,
} from "@/components/admin/UserManagement"
import {
  PendingPayments,
  WalletWithdrawalCard,
  CashfreeSettingsCard,
  QrUploadCard,
  EntryFeeCard,
  BlockedPaymentCard,
  PaymentHistoryTable,
} from "@/components/admin/PaymentManagement"
import {
  VipModalSettingsCard,
  TimePerQuestionCard,
  LiveQuizTimeCard,
  AiQuestionLimitCard,
  MockExamSettingsCard,
  SeoSettingsCard,
  TargetAudienceCard,
  DemoQuestionsToggle,
  MaintenanceModeToggle,
  SocialMediaCard,
  NavbarLayoutCard,
  SeoVerificationCard,
} from "@/components/admin/SettingsManagement"
import {
  BackupPanel,
  BroadcastNoticePanel,
  BroadcastEmailPanel,
  PushPanel,
  SponsorsAdminCard,
  AdminSystem,
} from "@/components/admin/SystemManagement"
import { AdsManagement, AdAnalyticsPanel, AffiliateLinksAdmin } from "@/components/admin/AdManagement"
import {
  LeaderboardManagement,
  ReferralsAdmin,
  CertificateManagement,
  QuizSchedulerPanel,
} from "@/components/admin/LeaderboardManagement"
import { AdminTabJumpNav } from "@/components/admin/AdminTabJumpNav"
import { adminGetJsonArray } from "@/lib/admin/client"
import type { AdminTab } from "@/components/admin/AdminNavConfig"
import {
  PAYMENTS_JUMP_LINKS,
  SETTINGS_JUMP_LINKS,
  QUIZ_SETTINGS_JUMP_LINKS,
} from "@/components/admin/AdminNavConfig"

const QuizManagement = dynamic(() => import("@/components/admin/QuizManagement"), { ssr: false })
const TournamentManagement = dynamic(() => import("@/components/admin/TournamentManagement"), { ssr: false })
const PrizeManagement = dynamic(() => import("@/components/admin/PrizeManagement"), { ssr: false })
const AdminAnalytics = dynamic(() => import("@/components/AdminAnalytics"), { ssr: false })
const AdminAlerts = dynamic(() => import("@/components/AdminAlerts"), { ssr: false })
const CreatorManagement = dynamic(() => import("@/components/CreatorManagement"), { ssr: false })
const AdminAI = dynamic(() => import("@/components/AdminAI"), { ssr: false })
const UpiRequestPanel = dynamic(() => import("@/components/UpiRequestPanel"), { ssr: false })
const OrganizationManagement = dynamic(() => import("@/components/admin/OrganizationManagement"), { ssr: false })
const SubscriptionPlans = dynamic(() => import("@/components/admin/SubscriptionPlans"), { ssr: false })
const AIInsightsPanel = dynamic(() => import("@/components/admin/AIInsightsPanel"), { ssr: false })
const APIKeyManagement = dynamic(() => import("@/components/admin/APIKeyManagement"), { ssr: false })
const AdvancedQuizModes = dynamic(() => import("@/components/admin/AdvancedQuizModes"), { ssr: false })
const WhiteLabelSettings = dynamic(() => import("@/components/admin/WhiteLabelSettings"), { ssr: false })

function ReportsPanel() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    const rows = await adminGetJsonArray<any>("/api/admin/reports")
    setItems(rows)
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-black text-lg text-white">User reports</div>
        <button type="button" onClick={load} className="admin-btn admin-btn-ghost-dark text-xs py-1.5 px-3" disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
      </div>
      <ul className="space-y-3 max-h-[400px] overflow-y-auto">
        {items.map((r, i) => (
          <li key={i} className="rounded-xl bg-white/[0.03] p-4 border border-white/5 text-sm">
            <div className="font-semibold text-white">{r.reason}</div>
            <div className="text-navy-400 mt-1 text-xs">
              {r.username} · {new Date(r.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
        {!items.length && !loading && <li className="text-navy-400 text-sm py-6 text-center">No reports</li>}
      </ul>
    </div>
  )
}

function AdminLoginHistoryCard() {
  const [history, setHistory] = useState<any[]>([])
  useEffect(() => {
    adminGetJsonArray<any>("/api/admin/login-history").then(setHistory)
  }, [])
  return (
    <div className="admin-card p-6">
      <div className="font-black mb-4 text-lg text-white">Admin login history</div>
      <div className="space-y-2">
        {history.slice(0, 8).map((h, i) => (
          <div key={i} className="text-xs flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className={h.success ? "text-emerald-400/90" : "text-red-400/90"}>
              {h.success ? "✓" : "✕"} {h.ip}
            </span>
            <span className="text-navy-400 shrink-0 ml-2">{new Date(h.timestamp).toLocaleString()}</span>
          </div>
        ))}
        {!history.length && <div className="text-navy-400 text-sm py-4">No entries yet</div>}
      </div>
    </div>
  )
}

export function AdminTabContent({
  tab,
  navigateToTab,
  stats,
}: {
  tab: AdminTab
  navigateToTab: (t: AdminTab) => void
  stats: AdminStatsSnapshot | null
}) {
  const pendingCount = stats?.pendingPayments ?? 0

  return (
    <>
      {tab === "Overview" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <Stat icon="👥" label="Players" value={(stats?.totalPlayers ?? 0).toLocaleString()} color="primary" onClick={() => navigateToTab("Users")} />
          <Stat icon="🔥" label="Active today" value={(stats?.activeToday ?? 0).toLocaleString()} color="success" />
          <Stat icon="💰" label="30d revenue" value={`₹${(stats?.revenue30d ?? 0).toLocaleString()}`} color="primary" onClick={() => navigateToTab("Payments")} />
          <Stat icon="🏦" label="All-time" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString()}`} color="primary" />
          <Stat icon="⏳" label="Pending" value={pendingCount} color={pendingCount > 0 ? "warning" : "primary"} onClick={() => navigateToTab("Payments")} />
          <Stat icon="📤" label="Withdrawals" value={stats?.pendingWithdrawals ?? 0} color="warning" onClick={() => navigateToTab("Payments")} />
        </div>
      )}

      <div className="space-y-8">
        {tab === "Overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <OverviewContext stats={stats} onNavigate={(key) => navigateToTab(key as AdminTab)} />
              <RecentActivity />
              <QuestionReportsCard />
            </div>
            <div className="space-y-6">
              <RevenueOverviewCard onNavigate={(key) => navigateToTab(key as AdminTab)} />
              <ReferralsOverviewCard />
              <WalletWithdrawalCard />
            </div>
          </div>
        )}

        {tab === "Users" && (
          <div className="space-y-6">
            <RegisteredUsersCard />
            <UsersTable />
          </div>
        )}
        {tab === "BlockedUsers" && <BlockedUsersCard />}
        {tab === "QuizViolations" && <IntegrityEventsCard />}
        {tab === "Prizes" && <PrizeManagement />}
        {tab === "Payments" && (
          <div className="space-y-6">
            <AdminTabJumpNav links={[...PAYMENTS_JUMP_LINKS]} ariaLabel="Payment and payout sections" />
            <div id="payment-pending" className="scroll-mt-28">
              <PendingPayments />
            </div>
            <div id="payment-withdrawals" className="scroll-mt-28">
              <WalletWithdrawalCard />
            </div>
            <div id="payment-upi-queue" className="scroll-mt-28">
              <UpiRequestPanel />
            </div>
            <div id="payment-history" className="scroll-mt-28">
              <PaymentHistoryTable />
            </div>
            <div id="payment-cashfree" className="scroll-mt-28">
              <CashfreeSettingsCard />
            </div>
            <div id="payment-qr" className="scroll-mt-28">
              <QrUploadCard />
            </div>
            <div id="payment-entry-fee" className="scroll-mt-28">
              <EntryFeeCard />
            </div>
            <div id="payment-blocked" className="scroll-mt-28">
              <BlockedPaymentCard />
            </div>
          </div>
        )}
        {tab === "Quizzes" && <QuizManagement />}
        {tab === "Tournaments" && <TournamentManagement />}
        {tab === "Settings" && (
          <div className="space-y-6">
            <p className="text-xs text-white/45 max-w-3xl">
              Gateway, manual UPI QR, entry fee, and blocked payment thresholds live under{" "}
              <button type="button" className="text-accent font-bold underline-offset-2 hover:underline" onClick={() => navigateToTab("Payments")}>
                Payments
              </button>
              .
            </p>
            <AdminTabJumpNav links={[...SETTINGS_JUMP_LINKS]} ariaLabel="Global settings sections" />
            <div id="settings-vip" className="scroll-mt-28">
              <VipModalSettingsCard />
            </div>
            <div id="settings-navbar" className="scroll-mt-28">
              <NavbarLayoutCard />
            </div>
            <div id="settings-seo-verify" className="scroll-mt-28">
              <SeoVerificationCard />
            </div>
            <div id="settings-seo" className="scroll-mt-28">
              <SeoSettingsCard />
            </div>
            <div id="settings-maintenance" className="scroll-mt-28">
              <MaintenanceModeToggle />
            </div>
            <div id="settings-social" className="scroll-mt-28">
              <SocialMediaCard />
            </div>
            <div id="settings-audience" className="scroll-mt-28">
              <TargetAudienceCard />
            </div>
          </div>
        )}
        {tab === "QuizSettings" && (
          <div className="space-y-6">
            <AdminTabJumpNav links={[...QUIZ_SETTINGS_JUMP_LINKS]} ariaLabel="Quiz timing and AI settings" />
            <div id="quizset-live-time" className="scroll-mt-28">
              <LiveQuizTimeCard />
            </div>
            <div id="quizset-timer" className="scroll-mt-28">
              <TimePerQuestionCard />
            </div>
            <div id="quizset-ai-limit" className="scroll-mt-28">
              <AiQuestionLimitCard />
            </div>
            <div id="quizset-demo" className="scroll-mt-28">
              <DemoQuestionsToggle />
            </div>
            <div id="quizset-mock" className="scroll-mt-28">
              <MockExamSettingsCard />
            </div>
          </div>
        )}
        {tab === "System" && (
          <div className="space-y-6">
            <BroadcastNoticePanel />
            <BroadcastEmailPanel />
            <SponsorsAdminCard />
            <AdminSystem />
            <BackupPanel />
            <PushPanel />
          </div>
        )}
        {tab === "Ads" && (
          <div className="space-y-6">
            <AdsManagement />
            <AdAnalyticsPanel />
            <AffiliateLinksAdmin />
          </div>
        )}
        {tab === "Leaderboard" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-white/80">
              <span className="font-bold text-mint">UPI payout queue</span> — approve user UPI payout requests under{" "}
              <button type="button" className="text-accent font-black underline-offset-2 hover:underline" onClick={() => navigateToTab("Payments")}>
                Payments → UPI request queue
              </button>
              .
            </div>
            <LeaderboardManagement />
            <ReferralsAdmin />
          </div>
        )}
        {tab === "Certificates" && <CertificateManagement />}
        {tab === "QuizSchedule" && <QuizSchedulerPanel />}
        {tab === "Reports" && (
          <div className="space-y-6">
            <AdminLoginHistoryCard />
            <ReportsPanel />
          </div>
        )}
        {tab === "InspectAlerts" && <InspectAlertsCard />}
        {tab === "Creators" && <CreatorManagement />}
        {tab === "Analytics" && <AdminAnalytics />}
        {tab === "Alerts" && <AdminAlerts />}
        {tab === "AIAssistant" && <AdminAI stats={stats} onNavigate={(key) => navigateToTab(key as AdminTab)} />}
        {tab === "Organizations" && <OrganizationManagement />}
        {tab === "Subscriptions" && <SubscriptionPlans />}
        {tab === "AIInsights" && <AIInsightsPanel />}
        {tab === "APIKeys" && <APIKeyManagement />}
        {tab === "QuizModes" && <AdvancedQuizModes />}
        {tab === "WhiteLabel" && <WhiteLabelSettings />}
      </div>
    </>
  )
}

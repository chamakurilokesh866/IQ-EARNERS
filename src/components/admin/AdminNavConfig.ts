export type AdminTab =
  | "Overview"
  | "Users"
  | "BlockedUsers"
  | "QuizViolations"
  | "Prizes"
  | "Payments"
  | "Quizzes"
  | "QuizSettings"
  | "Tournaments"
  | "Leaderboard"
  | "Certificates"
  | "Alerts"
  | "Analytics"
  | "DataRoom"
  | "System"
  | "Settings"
  | "Ads"
  | "QuizSchedule"
  | "Reports"
  | "InspectAlerts"
  | "Creators"
  | "AIAssistant"
  | "Organizations"
  | "Subscriptions"
  | "AIInsights"
  | "APIKeys"
  | "QuizModes"
  | "WhiteLabel"
  | "MoneyRisk"
  | "Security"

export type NavSection =
  | "Dashboard"
  | "People"
  | "Quiz"
  | "Payments"
  | "Growth"
  | "Platform"
  | "Operations"
  | "AI"
  | "Enterprise"

export const SECTION_HEADING: Record<NavSection, string> = {
  Dashboard: "Dashboard",
  People: "People & access",
  Quiz: "Quiz & content",
  Payments: "Payments & payouts",
  Growth: "Growth & ads",
  Platform: "Platform settings",
  Operations: "Operations",
  AI: "AI",
  Enterprise: "Enterprise",
}

export const ADMIN_NAV_ITEMS: {
  key: AdminTab
  icon: string
  label: string
  section: NavSection
  keywords?: string[]
}[] = [
  { key: "Overview", icon: "◆", label: "Overview", section: "Dashboard", keywords: ["dashboard", "home", "summary", "metrics"] },
  { key: "Users", icon: "◎", label: "All Users", section: "People", keywords: ["players", "members", "accounts", "registered"] },
  { key: "BlockedUsers", icon: "⊘", label: "Blocked Users", section: "People", keywords: ["blocked", "ban", "unblock", "fullscreen", "violation", "quiz block"] },
  { key: "Creators", icon: "✦", label: "Creators", section: "People", keywords: ["influencers", "partners", "dashboard", "hub"] },
  { key: "QuizViolations", icon: "⚠", label: "Quiz Violations", section: "People", keywords: ["fullscreen exit", "tab switch", "integrity", "cheating", "warnings", "violations"] },
  { key: "InspectAlerts", icon: "🛡", label: "Inspect Alerts", section: "People", keywords: ["devtools", "inspect", "block", "ip", "unauthorized"] },
  { key: "Quizzes", icon: "📝", label: "Quizzes", section: "Quiz", keywords: ["questions", "ai", "generate", "upload", "pdf", "csv"] },
  { key: "QuizSettings", icon: "⏱", label: "Quiz Settings", section: "Quiz", keywords: ["timer", "time per question", "live quiz", "8pm", "countdown", "ai limit", "demo"] },
  { key: "QuizSchedule", icon: "📅", label: "Quiz Scheduler", section: "Quiz", keywords: ["schedule", "release", "materials"] },
  { key: "Tournaments", icon: "🏆", label: "Tournaments", section: "Quiz", keywords: ["events", "competitions", "mega", "live"] },
  { key: "Prizes", icon: "🎁", label: "Prizes", section: "Quiz", keywords: ["rewards", "gifts", "winners"] },
  { key: "Certificates", icon: "📜", label: "Certificates", section: "Quiz", keywords: ["cert", "download"] },
  { key: "Leaderboard", icon: "📊", label: "Leaderboard & referrals", section: "Quiz", keywords: ["rankings", "scores", "winners", "transparency", "referrals", "referral"] },
  { key: "Payments", icon: "💰", label: "Payments", section: "Payments", keywords: ["revenue", "pending", "approve", "upi", "cashfree", "wallet", "payout", "withdrawal", "qr", "entry fee", "gateway", "history"] },
  {
    key: "MoneyRisk",
    icon: "⚖",
    label: "Money & disputes",
    section: "Payments",
    keywords: ["ledger", "tournament fee", "prize pool", "chargeback", "fraud", "dispute", "reconciliation", "platform fee"],
  },
  { key: "Ads", icon: "📢", label: "Ads", section: "Growth", keywords: ["advertising", "adslot", "affiliate"] },
  { key: "Analytics", icon: "📈", label: "Analytics", section: "Growth", keywords: ["stats", "charts", "revenue"] },
  { key: "DataRoom", icon: "📦", label: "Buyer Data Room", section: "Growth", keywords: ["acquisition", "due diligence", "buyer", "investor", "mrr", "arr", "export"] },
  { key: "Settings", icon: "⚙", label: "Global Settings", section: "Platform", keywords: ["navbar", "seo", "maintenance", "social", "instagram", "facebook", "vip", "modal", "audience"] },
  { key: "Alerts", icon: "🔔", label: "Alerts", section: "Operations", keywords: ["notifications", "broadcast"] },
  { key: "System", icon: "🛠", label: "System Tools", section: "Operations", keywords: ["broadcast", "sponsors", "backup", "push", "email"] },
  { key: "Reports", icon: "🚩", label: "Reports & audit", section: "Operations", keywords: ["feedback", "integrity", "reports", "login", "admin login"] },
  {
    key: "Security",
    icon: "🔐",
    label: "Security",
    section: "Operations",
    keywords: ["webhook", "rate limit", "verify order", "blocked ip", "forensics", "ops"],
  },
  {
    key: "AIAssistant",
    icon: "AI",
    label: "AI Assistant",
    section: "AI",
    keywords: ["ai", "monitor", "seo", "security", "errors", "content", "blog", "growth", "database", "recommendations"],
  },
  { key: "AIInsights", icon: "🧠", label: "AI Insights", section: "AI", keywords: ["predictions", "analytics", "ml", "forecast", "recommendations", "performance", "difficulty"] },
  { key: "Organizations", icon: "🏛", label: "Organizations", section: "Enterprise", keywords: ["school", "college", "university", "corporate", "coaching", "institute", "org", "bulk"] },
  { key: "Subscriptions", icon: "💎", label: "Subscriptions", section: "Enterprise", keywords: ["plans", "pricing", "pro", "enterprise", "free", "revenue", "mrr", "tier"] },
  { key: "APIKeys", icon: "🔑", label: "API & Webhooks", section: "Enterprise", keywords: ["api", "key", "webhook", "integration", "lms", "rest", "endpoint", "developer"] },
  { key: "QuizModes", icon: "🎮", label: "Quiz Modes", section: "Enterprise", keywords: ["adaptive", "practice", "mock", "exam", "team", "battle", "spaced", "repetition", "tutor", "timed"] },
  { key: "WhiteLabel", icon: "🎨", label: "White Label", section: "Enterprise", keywords: ["branding", "custom", "logo", "domain", "theme", "colors", "certificate", "email"] },
]

/** High-traffic areas — surfaced in command header for fast jumps. */
export const HEADER_QUICK_TABS: AdminTab[] = ["Payments", "Users", "Quizzes", "Settings", "Analytics"]

export const PAYMENTS_JUMP_LINKS = [
  { id: "payment-pending", label: "Pending approvals" },
  { id: "payment-withdrawals", label: "Wallet withdrawals" },
  { id: "payment-upi-queue", label: "UPI request queue" },
  { id: "payment-history", label: "Payment history" },
  { id: "payment-cashfree", label: "Cashfree gateway" },
  { id: "payment-qr", label: "UPI QR & ID" },
  { id: "payment-entry-fee", label: "Entry fee" },
  { id: "payment-tournament-fee", label: "Tournament fee %" },
  { id: "payment-blocked", label: "Blocked amounts" },
] as const

export const SETTINGS_JUMP_LINKS = [
  { id: "settings-vip", label: "VIP modal" },
  { id: "settings-navbar", label: "Navbar layout" },
  { id: "settings-seo-verify", label: "SEO verification" },
  { id: "settings-seo", label: "SEO & metadata" },
  { id: "settings-maintenance", label: "Maintenance" },
  { id: "settings-social", label: "Social links" },
  { id: "settings-audience", label: "Target audience" },
] as const

export const QUIZ_SETTINGS_JUMP_LINKS = [
  { id: "quizset-live-time", label: "Live quiz time" },
  { id: "quizset-timer", label: "Time per question" },
  { id: "quizset-ai-limit", label: "AI question limit" },
  { id: "quizset-demo", label: "Demo questions" },
  { id: "quizset-mock", label: "Mock exam" },
] as const

export const LS_SIDEBAR_COMPACT = "admin_sidebar_compact"
export const LS_ADMIN_SECTIONS = "admin_workspace_sections_v1"

export function parseTabParam(param: string | null): AdminTab | null {
  if (!param) return null
  const norm = param.trim()
  const found = ADMIN_NAV_ITEMS.find((n) => n.key.toLowerCase() === norm.toLowerCase())
  return found ? found.key : null
}

export const NAV_SECTIONS_ORDER: NavSection[] = [
  "Dashboard",
  "People",
  "Quiz",
  "Payments",
  "Growth",
  "Platform",
  "Operations",
  "AI",
  "Enterprise",
]

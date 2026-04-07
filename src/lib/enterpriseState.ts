/**
 * Enterprise admin data persisted inside settings.enterpriseState (Supabase or file).
 * Orgs access the platform at /org/[slug] with their own auth, quizzes, members.
 */

export type EnterpriseOrg = {
  id: string
  slug: string
  name: string
  type: "school" | "college" | "university" | "corporate" | "coaching" | "other"
  plan: "free" | "pro" | "enterprise"
  contactEmail: string
  contactPhone?: string
  logo?: string
  domain?: string
  memberCount: number
  quizCount: number
  active: boolean
  approved: boolean
  suspended: boolean
  createdAt: string
  expiresAt?: string
  ownerName: string
  ownerEmail: string
  ownerPasswordHash: string
  primaryColor?: string
  accentColor?: string
  tagline?: string
}

export type OrgMember = {
  id: string
  orgId: string
  username: string
  displayName: string
  email?: string
  passwordHash: string
  role: "owner" | "admin" | "teacher" | "student"
  active: boolean
  joinedAt: string
  lastLoginAt?: string
  quizzesTaken: number
  totalScore: number
}

export type OrgQuiz = {
  id: string
  orgId: string
  title: string
  description?: string
  category: string
  difficulty: "Easy" | "Medium" | "Hard"
  questions: OrgQuizQuestion[]
  createdBy: string
  createdAt: string
  published: boolean
  timePerQuestion?: number
  scheduledAt?: string
}

export type OrgQuizQuestion = {
  question: string
  options: string[]
  correct: number
  explanation?: string
}

export type OrgQuizAttempt = {
  id: string
  orgId: string
  quizId: string
  memberId: string
  memberName: string
  score: number
  total: number
  timeSeconds: number
  completedAt: string
  answers: number[]
}

export type OrgLeaderboardEntry = {
  memberId: string
  memberName: string
  totalScore: number
  quizzesTaken: number
  avgScore: number
  rank?: number
}

export type EnterprisePlan = {
  id: string
  name: string
  tier: "free" | "pro" | "enterprise" | "custom"
  priceMonthly: number
  priceYearly: number
  currency: string
  features: string[]
  maxUsers: number
  maxQuizzes: number
  maxStorage: number
  aiCredits: number
  whiteLabel: boolean
  apiAccess: boolean
  prioritySupport: boolean
  active: boolean
  subscriberCount: number
}

export type EnterpriseSubscription = {
  id: string
  orgId: string
  orgName: string
  planId: string
  planName: string
  tier: string
  status: "active" | "expired" | "cancelled" | "trial"
  startDate: string
  endDate: string
  amount: number
  autoRenew: boolean
}

export type StoredApiKey = {
  id: string
  name: string
  keyHash: string
  keyPrefix: string
  orgId?: string
  orgName?: string
  permissions: string[]
  rateLimit: number
  requestsToday: number
  requestsMonth: number
  active: boolean
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  usageDay?: string
  usageMonth?: string
}

export type EnterpriseWebhook = {
  id: string
  url: string
  events: string[]
  active: boolean
  secretHash: string
  secretPrefix: string
  failureCount: number
  lastTriggeredAt?: string
}

export type WhiteLabelPersisted = {
  orgId?: string
  orgName?: string
  brandName: string
  tagline: string
  primaryColor: string
  accentColor: string
  logoUrl: string
  faviconUrl: string
  customDomain: string
  customCss: string
  emailFromName: string
  emailFromAddress: string
  certificateTemplate: string
  footerText: string
  hideIqBranding: boolean
  customLoginPage: boolean
  customTermsUrl: string
  customPrivacyUrl: string
}

export type QuizModeOverride = { enabled?: boolean; config?: Record<string, unknown> }

export type AIInsightsPersisted = {
  data: unknown | null
  updatedAt: number
}

export type EnterpriseState = {
  organizations: EnterpriseOrg[]
  orgMembers: Record<string, OrgMember[]>
  orgQuizzes: Record<string, OrgQuiz[]>
  orgAttempts: Record<string, OrgQuizAttempt[]>
  plans: EnterprisePlan[]
  subscriptions: EnterpriseSubscription[]
  apiKeys: StoredApiKey[]
  webhooks: EnterpriseWebhook[]
  whiteLabel: WhiteLabelPersisted
  quizModeOverrides: Record<string, QuizModeOverride>
  aiInsights: AIInsightsPersisted
}

const DEFAULT_PLANS: EnterprisePlan[] = [
  {
    id: "free",
    name: "Starter",
    tier: "free",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "INR",
    features: [
      "Up to 50 students",
      "5 quizzes/month",
      "Basic analytics",
      "Community support",
      "Standard certificates"
    ],
    maxUsers: 50,
    maxQuizzes: 5,
    maxStorage: 100,
    aiCredits: 10,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    active: true,
    subscriberCount: 0
  },
  {
    id: "pro",
    name: "Professional",
    tier: "pro",
    priceMonthly: 999,
    priceYearly: 9999,
    currency: "INR",
    features: [
      "Up to 500 students",
      "Unlimited quizzes",
      "AI question generation",
      "Advanced analytics",
      "Custom certificates",
      "Priority email support",
      "Bulk import/export",
      "Quiz scheduling"
    ],
    maxUsers: 500,
    maxQuizzes: -1,
    maxStorage: 5000,
    aiCredits: 500,
    whiteLabel: false,
    apiAccess: true,
    prioritySupport: true,
    active: true,
    subscriberCount: 0
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tier: "enterprise",
    priceMonthly: 4999,
    priceYearly: 49999,
    currency: "INR",
    features: [
      "Unlimited students",
      "Unlimited quizzes",
      "AI-powered adaptive learning",
      "Full analytics suite",
      "White-label branding",
      "API access & webhooks",
      "Dedicated support",
      "Custom integrations",
      "LMS integration",
      "SSO/SAML support",
      "SLA guarantee"
    ],
    maxUsers: -1,
    maxQuizzes: -1,
    maxStorage: -1,
    aiCredits: -1,
    whiteLabel: true,
    apiAccess: true,
    prioritySupport: true,
    active: true,
    subscriberCount: 0
  }
]

const DEFAULT_WHITE_LABEL: WhiteLabelPersisted = {
  brandName: "",
  tagline: "",
  primaryColor: "#7c3aed",
  accentColor: "#f5b301",
  logoUrl: "",
  faviconUrl: "",
  customDomain: "",
  customCss: "",
  emailFromName: "",
  emailFromAddress: "",
  certificateTemplate: "default",
  footerText: "",
  hideIqBranding: false,
  customLoginPage: false,
  customTermsUrl: "",
  customPrivacyUrl: ""
}

export function defaultEnterpriseState(): EnterpriseState {
  return {
    organizations: [],
    orgMembers: {},
    orgQuizzes: {},
    orgAttempts: {},
    plans: JSON.parse(JSON.stringify(DEFAULT_PLANS)) as EnterprisePlan[],
    subscriptions: [],
    apiKeys: [],
    webhooks: [],
    whiteLabel: { ...DEFAULT_WHITE_LABEL },
    quizModeOverrides: {},
    aiInsights: { data: null, updatedAt: 0 }
  }
}

export function mergePlansWithDefaults(stored: EnterprisePlan[] | undefined): EnterprisePlan[] {
  const byId = new Map((stored ?? []).map((p) => [p.id, p]))
  return DEFAULT_PLANS.map((d) => {
    const s = byId.get(d.id)
    return s ? { ...d, ...s, features: Array.isArray(s.features) && s.features.length ? s.features : d.features } : d
  })
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "org"
}

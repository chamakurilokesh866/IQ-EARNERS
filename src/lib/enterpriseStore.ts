import { createHash, randomBytes } from "crypto"
import { getSettings, updateSettings } from "./settings"
import type {
  EnterpriseState, EnterpriseOrg, OrgMember, OrgQuiz, OrgQuizAttempt,
  StoredApiKey, EnterpriseWebhook, EnterpriseSubscription
} from "./enterpriseState"
import { defaultEnterpriseState, mergePlansWithDefaults, slugify } from "./enterpriseState"

function readState(raw: unknown): EnterpriseState {
  const base = defaultEnterpriseState()
  if (!raw || typeof raw !== "object") return base
  const e = raw as Partial<EnterpriseState>
  return {
    organizations: Array.isArray(e.organizations) ? e.organizations : base.organizations,
    orgMembers: e.orgMembers && typeof e.orgMembers === "object" ? e.orgMembers : base.orgMembers,
    orgQuizzes: e.orgQuizzes && typeof e.orgQuizzes === "object" ? e.orgQuizzes : base.orgQuizzes,
    orgAttempts: e.orgAttempts && typeof e.orgAttempts === "object" ? e.orgAttempts : base.orgAttempts,
    plans: mergePlansWithDefaults(e.plans as EnterpriseState["plans"]),
    subscriptions: Array.isArray(e.subscriptions) ? e.subscriptions : base.subscriptions,
    apiKeys: Array.isArray(e.apiKeys) ? e.apiKeys : base.apiKeys,
    webhooks: Array.isArray(e.webhooks) ? e.webhooks : base.webhooks,
    whiteLabel: e.whiteLabel && typeof e.whiteLabel === "object" ? { ...base.whiteLabel, ...e.whiteLabel } : base.whiteLabel,
    quizModeOverrides: e.quizModeOverrides && typeof e.quizModeOverrides === "object" ? e.quizModeOverrides : base.quizModeOverrides,
    aiInsights:
      e.aiInsights && typeof e.aiInsights === "object"
        ? { data: e.aiInsights.data ?? null, updatedAt: Number(e.aiInsights.updatedAt) || 0 }
        : base.aiInsights
  }
}

export async function getEnterpriseState(): Promise<EnterpriseState> {
  const s = await getSettings()
  const raw = (s as { enterpriseState?: unknown }).enterpriseState
  return readState(raw)
}

export async function saveEnterpriseState(next: EnterpriseState): Promise<boolean> {
  return updateSettings({ enterpriseState: next } as Parameters<typeof updateSettings>[0])
}

export async function patchEnterpriseState(mutator: (prev: EnterpriseState) => EnterpriseState): Promise<EnterpriseState | null> {
  const prev = await getEnterpriseState()
  const next = mutator(prev)
  const ok = await saveEnterpriseState(next)
  return ok ? next : null
}

export function hashPassword(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export function verifyPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

export function generateApiKeyFull(): { full: string; prefix: string; hash: string } {
  const tail = randomBytes(24).toString("base64url")
  const full = `iq_live_${tail}`
  const prefix = full.slice(0, 14) + "…"
  return { full, prefix, hash: hashSecret(full) }
}

export function generateWebhookSecret(): { full: string; prefix: string; hash: string } {
  const full = `whsec_${randomBytes(24).toString("base64url")}`
  const prefix = full.slice(0, 10) + "…"
  return { full, prefix, hash: hashSecret(full) }
}

export function toPublicApiKey(row: StoredApiKey) {
  return {
    id: row.id, name: row.name, key: row.keyPrefix,
    orgId: row.orgId, orgName: row.orgName, permissions: row.permissions,
    rateLimit: row.rateLimit, requestsToday: row.requestsToday, requestsMonth: row.requestsMonth,
    active: row.active, createdAt: row.createdAt, lastUsedAt: row.lastUsedAt, expiresAt: row.expiresAt
  }
}

export function toPublicWebhook(w: EnterpriseWebhook) {
  return {
    id: w.id, url: w.url, events: w.events, active: w.active,
    secret: w.secretPrefix, failureCount: w.failureCount, lastTriggeredAt: w.lastTriggeredAt
  }
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomBytes(4).toString("hex")}`
}

export async function findOrgBySlug(slug: string): Promise<EnterpriseOrg | null> {
  const s = await getEnterpriseState()
  return s.organizations.find((o) => o.slug === slug) ?? null
}

export async function createOrganization(body: {
  name: string
  type: string
  contactEmail: string
  contactPhone?: string
  plan?: string
  domain?: string
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  primaryColor?: string
  accentColor?: string
  tagline?: string
}): Promise<EnterpriseOrg | null> {
  const name = String(body.name ?? "").trim()
  const ownerEmail = String(body.ownerEmail ?? body.contactEmail ?? "").trim()
  const ownerName = String(body.ownerName ?? "").trim()
  const ownerPassword = String(body.ownerPassword ?? "").trim()
  if (!name || !ownerEmail || !ownerName || ownerPassword.length < 6) return null

  const baseSlug = slugify(name)
  const s = await getEnterpriseState()
  let slug = baseSlug
  let suffix = 1
  while (s.organizations.some((o) => o.slug === slug)) {
    slug = `${baseSlug}-${suffix++}`
  }

  const type = (["school", "college", "university", "corporate", "coaching", "other"].includes(body.type)
    ? body.type : "other") as EnterpriseOrg["type"]
  const plan = (["free", "pro", "enterprise"].includes(String(body.plan)) ? body.plan : "free") as EnterpriseOrg["plan"]

  const org: EnterpriseOrg = {
    id: newId("org"), slug, name, type, plan,
    contactEmail: body.contactEmail?.trim() || ownerEmail,
    contactPhone: body.contactPhone?.trim() || undefined,
    domain: body.domain?.trim() || undefined,
    memberCount: 1, quizCount: 0, active: true, approved: true, suspended: false,
    createdAt: new Date().toISOString(),
    ownerName, ownerEmail,
    ownerPasswordHash: hashPassword(ownerPassword),
    primaryColor: body.primaryColor?.trim() || undefined,
    accentColor: body.accentColor?.trim() || undefined,
    tagline: body.tagline?.trim() || undefined,
  }

  const ownerMember: OrgMember = {
    id: newId("mem"), orgId: org.id, username: ownerEmail.split("@")[0],
    displayName: ownerName, email: ownerEmail,
    passwordHash: hashPassword(ownerPassword),
    role: "owner", active: true, joinedAt: org.createdAt,
    quizzesTaken: 0, totalScore: 0
  }

  const next = await patchEnterpriseState((prev) => ({
    ...prev,
    organizations: [...prev.organizations, org],
    orgMembers: { ...prev.orgMembers, [org.id]: [ownerMember] },
    orgQuizzes: { ...prev.orgQuizzes, [org.id]: [] },
    orgAttempts: { ...prev.orgAttempts, [org.id]: [] }
  }))
  return next?.organizations.find((o) => o.id === org.id) ?? null
}

export async function addOrgMember(orgId: string, body: {
  username: string; displayName: string; email?: string; password: string; role?: OrgMember["role"]
}): Promise<OrgMember | null> {
  const username = String(body.username ?? "").trim().toLowerCase()
  const displayName = String(body.displayName ?? body.username ?? "").trim()
  const password = String(body.password ?? "").trim()
  if (!username || password.length < 4) return null

  const s = await getEnterpriseState()
  const org = s.organizations.find((o) => o.id === orgId)
  if (!org || !org.active || org.suspended) return null

  const plan = s.plans.find((p) => p.id === org.plan) ?? s.plans[0]
  const existing = s.orgMembers[orgId] ?? []
  if (plan.maxUsers > 0 && existing.length >= plan.maxUsers) return null
  if (existing.some((m) => m.username.toLowerCase() === username)) return null

  const member: OrgMember = {
    id: newId("mem"), orgId, username, displayName, email: body.email?.trim() || undefined,
    passwordHash: hashPassword(password),
    role: body.role && ["admin", "teacher", "student"].includes(body.role) ? body.role : "student",
    active: true, joinedAt: new Date().toISOString(),
    quizzesTaken: 0, totalScore: 0
  }

  const next = await patchEnterpriseState((prev) => ({
    ...prev,
    orgMembers: { ...prev.orgMembers, [orgId]: [...(prev.orgMembers[orgId] ?? []), member] },
    organizations: prev.organizations.map((o) => o.id === orgId ? { ...o, memberCount: (prev.orgMembers[orgId]?.length ?? 0) + 1 } : o)
  }))
  return next ? member : null
}

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const s = await getEnterpriseState()
  return s.orgMembers[orgId] ?? []
}

export async function authenticateOrgMember(orgId: string, username: string, password: string): Promise<OrgMember | null> {
  const members = await listOrgMembers(orgId)
  const member = members.find((m) =>
    (m.username.toLowerCase() === username.toLowerCase() || m.email?.toLowerCase() === username.toLowerCase()) && m.active
  )
  if (!member) return null
  if (!verifyPassword(password, member.passwordHash)) return null

  await patchEnterpriseState((prev) => ({
    ...prev,
    orgMembers: {
      ...prev.orgMembers,
      [orgId]: (prev.orgMembers[orgId] ?? []).map((m) =>
        m.id === member.id ? { ...m, lastLoginAt: new Date().toISOString() } : m
      )
    }
  }))
  return member
}

export async function authenticateOrgOwner(slug: string, email: string, password: string): Promise<{ org: EnterpriseOrg; member: OrgMember } | null> {
  const s = await getEnterpriseState()
  const org = s.organizations.find((o) => o.slug === slug && o.active && !o.suspended)
  if (!org) return null
  if (!verifyPassword(password, org.ownerPasswordHash) || org.ownerEmail.toLowerCase() !== email.toLowerCase()) return null

  const members = s.orgMembers[org.id] ?? []
  const ownerMember = members.find((m) => m.role === "owner")
  if (!ownerMember) return null
  return { org, member: ownerMember }
}

export async function createOrgQuiz(orgId: string, quiz: Omit<OrgQuiz, "id" | "orgId" | "createdAt">): Promise<OrgQuiz | null> {
  const s = await getEnterpriseState()
  const org = s.organizations.find((o) => o.id === orgId && o.active && !o.suspended)
  if (!org) return null

  const plan = s.plans.find((p) => p.id === org.plan) ?? s.plans[0]
  const existing = s.orgQuizzes[orgId] ?? []
  if (plan.maxQuizzes > 0 && existing.length >= plan.maxQuizzes) return null

  const full: OrgQuiz = {
    ...quiz, id: newId("oq"), orgId, createdAt: new Date().toISOString()
  }

  const next = await patchEnterpriseState((prev) => ({
    ...prev,
    orgQuizzes: { ...prev.orgQuizzes, [orgId]: [...(prev.orgQuizzes[orgId] ?? []), full] },
    organizations: prev.organizations.map((o) => o.id === orgId ? { ...o, quizCount: (prev.orgQuizzes[orgId]?.length ?? 0) + 1 } : o)
  }))
  return next ? full : null
}

export async function listOrgQuizzes(orgId: string): Promise<OrgQuiz[]> {
  const s = await getEnterpriseState()
  return s.orgQuizzes[orgId] ?? []
}

export async function submitOrgQuizAttempt(attempt: Omit<OrgQuizAttempt, "id" | "completedAt">): Promise<OrgQuizAttempt | null> {
  const full: OrgQuizAttempt = { ...attempt, id: newId("oa"), completedAt: new Date().toISOString() }

  const next = await patchEnterpriseState((prev) => ({
    ...prev,
    orgAttempts: { ...prev.orgAttempts, [attempt.orgId]: [...(prev.orgAttempts[attempt.orgId] ?? []), full] },
    orgMembers: {
      ...prev.orgMembers,
      [attempt.orgId]: (prev.orgMembers[attempt.orgId] ?? []).map((m) =>
        m.id === attempt.memberId ? { ...m, quizzesTaken: m.quizzesTaken + 1, totalScore: m.totalScore + attempt.score } : m
      )
    }
  }))
  return next ? full : null
}

export async function getOrgLeaderboard(orgId: string): Promise<{ memberId: string; memberName: string; totalScore: number; quizzesTaken: number; avgScore: number; rank: number }[]> {
  const s = await getEnterpriseState()
  const members = s.orgMembers[orgId] ?? []
  const sorted = members
    .filter((m) => m.quizzesTaken > 0)
    .sort((a, b) => b.totalScore - a.totalScore || a.quizzesTaken - b.quizzesTaken)
    .map((m, i) => ({
      memberId: m.id, memberName: m.displayName, totalScore: m.totalScore,
      quizzesTaken: m.quizzesTaken, avgScore: m.quizzesTaken > 0 ? Math.round(m.totalScore / m.quizzesTaken * 10) / 10 : 0,
      rank: i + 1
    }))
  return sorted
}

export function recomputePlanSubscriberCounts(state: EnterpriseState): EnterpriseState {
  const counts: Record<string, number> = {}
  for (const sub of state.subscriptions) {
    if (sub.status !== "active" && sub.status !== "trial") continue
    const key = state.plans.find((p) => p.name === sub.planName)?.id ?? sub.tier
    counts[key] = (counts[key] ?? 0) + 1
  }
  const plans = state.plans.map((p) => ({ ...p, subscriberCount: counts[p.id] ?? 0 }))
  return { ...state, plans }
}

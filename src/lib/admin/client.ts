/** Shared admin API helpers — same options everywhere, less duplication. */

const defaultInit: RequestInit = {
  cache: "no-store",
  credentials: "include"
}

export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(path, { ...defaultInit, ...init })
}

export async function adminGetJsonArray<T>(path: string): Promise<T[]> {
  const r = await adminFetch(path)
  const j = (await r.json().catch(() => ({}))) as { data?: unknown }
  return Array.isArray(j?.data) ? (j.data as T[]) : []
}

export type AdminPendingPaymentRow = {
  id: string
  amount: number
  gateway?: string
  type?: string
  status?: string
  created_at?: number
  meta?: Record<string, unknown>
}

/** Pending payments list; empty array on 401/403 or parse errors. */
export async function fetchAdminPendingPayments(): Promise<AdminPendingPaymentRow[]> {
  const r = await adminFetch("/api/admin/payments/pending")
  if (r.status === 401 || r.status === 403) return []
  const j = await r.json().catch(() => ({ data: [] }))
  return (Array.isArray(j?.data) ? j.data : []) as AdminPendingPaymentRow[]
}

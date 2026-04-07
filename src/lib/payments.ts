/**
 * Payments storage: Supabase (production/Vercel) with file fallback (local dev).
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "payments.json")

export type Payment = {
  id: string
  orderId?: string
  cashfreeOrderId?: string
  paymentSessionId?: string
  amount: number
  type: string
  status: string
  gateway?: string
  meta?: Record<string, unknown>
  created_at: number
  confirmed_at?: number
  profileId?: string
}

async function readFromFile(): Promise<Payment[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const arr = JSON.parse(txt || "[]")
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function writeToFile(arr: Payment[]): Promise<boolean> {
  try {
    const dir = path.dirname(FILE_PATH)
    await fs.mkdir(dir, { recursive: true }).catch(() => {})
    await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
    return true
  } catch {
    return false
  }
}

export async function getPayments(): Promise<Payment[]> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false })
      if (!error && Array.isArray(data)) {
        return data.map((r: any) => ({
          id: r.id,
          orderId: r.order_id,
          cashfreeOrderId: r.cashfree_order_id,
          paymentSessionId: r.payment_session_id,
          amount: Number(r.amount ?? 0),
          type: r.type ?? "tournament",
          status: r.status ?? "pending",
          gateway: r.gateway ?? "qr",
          meta: (r.meta as Record<string, unknown>) ?? {},
          created_at: Number(r.created_at ?? 0),
          confirmed_at: r.confirmed_at ? Number(r.confirmed_at) : undefined,
          profileId: r.profile_id ?? undefined
        }))
      }
    } catch {}
  }
  return readFromFile()
}

export async function findPayment(by: { orderId?: string; cashfreeOrderId?: string; paymentId?: string }): Promise<Payment | null> {
  const payments = await getPayments()
  return payments.find((p) => {
    if (by.paymentId && p.id === by.paymentId) return true
    if (by.orderId && (p.orderId === by.orderId || p.cashfreeOrderId === by.orderId || p.paymentSessionId === by.orderId)) return true
    if (by.cashfreeOrderId && (p.cashfreeOrderId === by.cashfreeOrderId || p.orderId === by.cashfreeOrderId)) return true
    return false
  }) ?? null
}

/** Check if UTR, Transaction ID or Order ID was already used in any unblock payment (success or pending). Prevents reuse. */
export async function isUtrOrTransIdUsed(utr: string, transId: string, orderId?: string): Promise<boolean> {
  const u = (utr || "").trim().replace(/\s/g, "")
  const t = (transId || "").trim().replace(/\s/g, "")
  const o = (orderId || "").trim().replace(/\s/g, "")
  if (u.length < 6 && t.length < 6 && o.length < 4) return false

  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("id, meta")
        .eq("type", "unblock")
      if (error) return false
      for (const row of data ?? []) {
        const meta = (row?.meta ?? {}) as Record<string, unknown>
        const ex = (meta?.extractedText ?? meta) as Record<string, unknown> | undefined
        const rowUtr = String(ex?.utr ?? meta?.utr ?? "").trim().replace(/\s/g, "")
        const rowTrans = String(ex?.transId ?? meta?.transId ?? "").trim().replace(/\s/g, "")
        const rowOrder = String(ex?.orderId ?? meta?.orderId ?? "").trim().replace(/\s/g, "")
        if (u.length >= 6 && rowUtr && rowUtr === u) return true
        if (t.length >= 6 && rowTrans && rowTrans === t) return true
        if (o.length >= 4 && rowOrder && rowOrder === o) return true
      }
      return false
    } catch {
      return false
    }
  }
  const payments = await readFromFile()
  for (const p of payments) {
    if (p.type !== "unblock") continue
    const meta = (p.meta ?? {}) as Record<string, unknown>
    const ex = (meta?.extractedText ?? meta) as Record<string, unknown> | undefined
    const rowUtr = String(ex?.utr ?? meta?.utr ?? "").trim().replace(/\s/g, "")
    const rowTrans = String(ex?.transId ?? meta?.transId ?? "").trim().replace(/\s/g, "")
    const rowOrder = String(ex?.orderId ?? meta?.orderId ?? "").trim().replace(/\s/g, "")
    if (u.length >= 6 && rowUtr && rowUtr === u) return true
    if (t.length >= 6 && rowTrans && rowTrans === t) return true
    if (o.length >= 4 && rowOrder && rowOrder === o) return true
  }
  return false
}

function getMetaUsername(meta: Record<string, unknown> | undefined): string {
  if (!meta) return ""
  return String((meta.username ?? meta.name ?? meta.customerName ?? "") as string).trim()
}

/** Get the first entry-fee payment order_id for a user (by username). Used for blocked payment form. */
export async function getFirstEntryOrderId(username: string): Promise<string | null> {
  if (!username || !username.trim()) return null
  const unameLower = username.trim().toLowerCase()
  const { getProfileByUsername, getProfileByUid } = await import("./profiles")
  const profile = await getProfileByUsername(username.trim())
  const profileUid = profile?.uid

  const payments = await getPayments()
  const entryTypes = ["entry", "tournament", "tournament_entry"]
  let entryPayments = payments.filter((p) => {
    if (p.status !== "success") return false
    if (p.type === "unblock") return false
    const isEntry = entryTypes.includes(p.type) || p.gateway === "qr"
    if (!isEntry) return false
    if (profileUid && p.profileId === profileUid) return true
    const metaUname = getMetaUsername(p.meta as Record<string, unknown>).toLowerCase()
    if (metaUname === unameLower) return true
    return false
  })
  if (entryPayments.length === 0) {
    for (const p of payments) {
      if (p.status !== "success" || p.type === "unblock") continue
      if (p.profileId) {
        const prof = await getProfileByUid(p.profileId)
        if (prof && String(prof.username || "").toLowerCase() === unameLower) {
          const isEntry = entryTypes.includes(p.type) || p.gateway === "qr"
          if (isEntry) entryPayments = [...entryPayments, p]
        }
      }
    }
  }
  const sorted = [...entryPayments].sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0))
  const first = sorted[0]
  return first?.orderId ?? first?.cashfreeOrderId ?? null
}

/** Creates an unblock payment entry for Cashfree verify flow. */
export function createUnblockPaymentEntry(orderId: string, amount: number, username: string | null): Payment {
  const safe = orderId.replace(/[^a-zA-Z0-9_-]/g, "_")
  return {
    id: "cf_unblock_" + safe,
    orderId,
    cashfreeOrderId: orderId,
    amount: amount || 50,
    type: "unblock",
    status: "success",
    gateway: "cashfree",
    created_at: Date.now(),
    confirmed_at: Date.now(),
    meta: { fromVerify: true, unblock_username: username ?? undefined, unblockFor: username ?? undefined }
  }
}

export async function addPayment(payment: Payment): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const { error } = await supabase.from("payments").insert({
        id: payment.id,
        order_id: payment.orderId ?? null,
        cashfree_order_id: payment.cashfreeOrderId ?? null,
        payment_session_id: payment.paymentSessionId ?? null,
        amount: payment.amount,
        type: payment.type,
        status: payment.status,
        gateway: payment.gateway ?? "qr",
        meta: payment.meta ?? {},
        created_at: payment.created_at,
        confirmed_at: payment.confirmed_at ?? null,
        profile_id: payment.profileId ?? null
      })
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  arr.push(payment)
  return writeToFile(arr)
}

export async function updatePayment(id: string, updates: Partial<Payment> & { meta?: Record<string, unknown> }): Promise<boolean> {
  const supabase = createServerSupabase()
  if (supabase) {
    try {
      const payload: Record<string, unknown> = {}
      if (updates.status !== undefined) payload.status = updates.status
      if (updates.confirmed_at !== undefined) payload.confirmed_at = updates.confirmed_at
      if (updates.profileId !== undefined) payload.profile_id = updates.profileId
      if (updates.meta !== undefined) {
        const { data: row, error: selErr } = await supabase.from("payments").select("meta").eq("id", id).single()
        if (selErr) return false
        const current = (row?.meta as Record<string, unknown>) || {}
        payload.meta = { ...current, ...updates.meta }
      }
      if (Object.keys(payload).length === 0) return true
      const { error } = await supabase.from("payments").update(payload).eq("id", id)
      return !error
    } catch {
      return false
    }
  }
  const arr = await readFromFile()
  const idx = arr.findIndex((p) => p.id === id)
  if (idx === -1) return false
  arr[idx] = { ...arr[idx], ...updates }
  if (updates.meta) arr[idx].meta = { ...(arr[idx].meta || {}), ...updates.meta }
  return writeToFile(arr)
}


/**
 * Append-only money movements for paid tournament entries (gross, platform fee, prize-pool allocation).
 * Stored as JSON file locally; suitable for admin audit and revenue reconciliation.
 */
import { promises as fs } from "fs"
import path from "path"
import type { Payment } from "@/lib/payments"
import { getSettings } from "@/lib/settings"

const FILE_PATH = path.join(process.cwd(), "src", "data", "money-ledger.json")

export type MoneyLedgerEntry = {
  id: string
  ts: number
  type: "tournament_entry_gross" | "platform_fee" | "prize_pool_allocation"
  amountRupees: number
  currency: string
  paymentId: string
  orderId?: string
  tournamentId?: string
  username?: string
  /** Same prefix for all 3 lines from one payment */
  splitGroup: string
  meta?: Record<string, unknown>
}

async function readAll(): Promise<MoneyLedgerEntry[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const j = JSON.parse(txt)
    return Array.isArray(j) ? j : []
  } catch {
    return []
  }
}

async function writeAll(entries: MoneyLedgerEntry[]): Promise<void> {
  const dir = path.dirname(FILE_PATH)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
  await fs.writeFile(FILE_PATH, JSON.stringify(entries, null, 2), "utf-8")
}

export async function listMoneyLedgerEntries(limit = 800): Promise<MoneyLedgerEntry[]> {
  const all = await readAll()
  return all.slice(-limit).reverse()
}

/** Record gross / fee / pool split once per successful tournament_entry payment. */
export async function recordTournamentEntryLedgerIfNeeded(payment: Payment): Promise<void> {
  if (payment.type !== "tournament_entry" || payment.status !== "success") return
  const gross = Math.max(0, Math.round(Number(payment.amount) || 0))
  if (gross <= 0) return

  const existing = await readAll()
  const splitGroup = `split:${payment.id}`
  if (existing.some((e) => e.splitGroup === splitGroup)) return

  const settings = await getSettings()
  const pct = Math.min(100, Math.max(0, Number(settings.platformFeePercentTournament ?? 15)))
  const fee = Math.round((gross * pct) / 100)
  const pool = Math.max(0, gross - fee)
  const currency = String(settings.currency ?? "INR")
  const meta = (payment.meta ?? {}) as Record<string, unknown>
  const tournamentId = typeof meta.tournamentId === "string" ? meta.tournamentId : undefined
  const username = String(meta.username ?? meta.name ?? "").trim() || undefined
  const ts = payment.confirmed_at ?? payment.created_at ?? Date.now()
  const base = {
    paymentId: payment.id,
    orderId: payment.orderId ?? payment.cashfreeOrderId,
    tournamentId,
    username,
    currency,
    splitGroup,
  }

  const rows: MoneyLedgerEntry[] = [
    {
      id: `ml_${payment.id}_gross`,
      ts,
      type: "tournament_entry_gross",
      amountRupees: gross,
      ...base,
      meta: { platformFeePercent: pct },
    },
    {
      id: `ml_${payment.id}_fee`,
      ts,
      type: "platform_fee",
      amountRupees: fee,
      ...base,
      meta: { platformFeePercent: pct },
    },
    {
      id: `ml_${payment.id}_pool`,
      ts,
      type: "prize_pool_allocation",
      amountRupees: pool,
      ...base,
    },
  ]

  await writeAll([...existing, ...rows])
}

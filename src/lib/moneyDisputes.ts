/**
 * Lightweight dispute / chargeback tracking for real-money flows (admin workflow).
 */
import { randomBytes } from "crypto"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "money-disputes.json")

export type MoneyDisputeStatus = "open" | "reviewing" | "resolved" | "rejected"

export type MoneyDispute = {
  id: string
  subject: string
  detail: string
  username?: string
  paymentId?: string
  tournamentId?: string
  status: MoneyDisputeStatus
  createdAt: number
  updatedAt: number
  adminNotes?: string
}

async function readAll(): Promise<MoneyDispute[]> {
  try {
    const txt = await fs.readFile(FILE_PATH, "utf-8")
    const j = JSON.parse(txt)
    return Array.isArray(j) ? j : []
  } catch {
    return []
  }
}

async function writeAll(rows: MoneyDispute[]): Promise<void> {
  const dir = path.dirname(FILE_PATH)
  await fs.mkdir(dir, { recursive: true }).catch(() => {})
  await fs.writeFile(FILE_PATH, JSON.stringify(rows, null, 2), "utf-8")
}

export async function listMoneyDisputes(limit = 200): Promise<MoneyDispute[]> {
  const all = await readAll()
  return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit)
}

export async function createMoneyDispute(input: {
  subject: string
  detail: string
  username?: string
  paymentId?: string
  tournamentId?: string
}): Promise<MoneyDispute> {
  const now = Date.now()
  const row: MoneyDispute = {
    id: `disp_${now}_${randomBytes(4).toString("hex")}`,
    subject: String(input.subject ?? "").trim().slice(0, 200),
    detail: String(input.detail ?? "").trim().slice(0, 4000),
    username: input.username?.trim() || undefined,
    paymentId: input.paymentId?.trim() || undefined,
    tournamentId: input.tournamentId?.trim() || undefined,
    status: "open",
    createdAt: now,
    updatedAt: now,
  }
  const all = await readAll()
  await writeAll([row, ...all])
  return row
}

export async function updateMoneyDispute(
  id: string,
  patch: { status?: MoneyDisputeStatus; adminNotes?: string }
): Promise<MoneyDispute | null> {
  const all = await readAll()
  const i = all.findIndex((d) => d.id === id)
  if (i < 0) return null
  const now = Date.now()
  const next: MoneyDispute = {
    ...all[i]!,
    status: patch.status ?? all[i]!.status,
    adminNotes: patch.adminNotes !== undefined ? String(patch.adminNotes).slice(0, 4000) : all[i]!.adminNotes,
    updatedAt: now,
  }
  const copy = [...all]
  copy[i] = next
  await writeAll(copy)
  return next
}

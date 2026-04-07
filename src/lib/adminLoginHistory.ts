/**
 * Admin login history — stores login attempts (success + failure) with IP, user-agent, and timestamp.
 */
import { promises as fs } from "fs"
import path from "path"
import { createServerSupabase } from "./supabase"

const DATA_DIR = path.join(process.cwd(), "src", "data")
const HISTORY_FILE = path.join(DATA_DIR, "admin-login-history.json")
const MAX_ENTRIES = 100

export type AdminLoginRecord = {
    id: string
    ip: string
    userAgent: string
    username: string
    success: boolean
    reason?: string
    timestamp: number
}

async function readHistory(): Promise<AdminLoginRecord[]> {
    try {
        const txt = await fs.readFile(HISTORY_FILE, "utf-8")
        const arr = JSON.parse(txt || "[]")
        return Array.isArray(arr) ? arr : []
    } catch {
        return []
    }
}

async function writeHistory(records: AdminLoginRecord[]): Promise<void> {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true })
        await fs.writeFile(HISTORY_FILE, JSON.stringify(records, null, 2), "utf-8")
    } catch { }
}

export async function saveAdminLogin(data: {
    ip: string
    userAgent: string
    username: string
    success?: boolean
    reason?: string
}): Promise<void> {
    const record: AdminLoginRecord = {
        id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ip: data.ip.slice(0, 45),
        userAgent: data.userAgent.slice(0, 300),
        username: data.username.slice(0, 50),
        success: data.success !== false,
        reason: data.reason?.slice(0, 200),
        timestamp: Date.now(),
    }

    // Try Supabase first
    const supabase = createServerSupabase()
    if (supabase) {
        try {
            await supabase.from("admin_login_history").insert({
                id: record.id,
                ip: record.ip,
                user_agent: record.userAgent,
                username: record.username,
                success: record.success,
                reason: record.reason ?? null,
                timestamp: record.timestamp,
            })
            return
        } catch {
            // Fallback to file
        }
    }

    // Fallback: file-based storage
    const history = await readHistory()
    history.unshift(record)
    // Keep only latest entries
    await writeHistory(history.slice(0, MAX_ENTRIES))
}

export async function getAdminLoginHistory(limit = 50): Promise<AdminLoginRecord[]> {
    const supabase = createServerSupabase()
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from("admin_login_history")
                .select("id, ip, user_agent, username, success, reason, timestamp")
                .order("timestamp", { ascending: false })
                .limit(limit)
            if (!error && Array.isArray(data)) {
                return data.map((r) => ({
                    id: r.id,
                    ip: r.ip ?? "",
                    userAgent: r.user_agent ?? "",
                    username: r.username ?? "",
                    success: r.success !== false,
                    reason: r.reason ?? undefined,
                    timestamp: Number(r.timestamp ?? 0),
                }))
            }
        } catch {
            // Fallback to file
        }
    }

    const history = await readHistory()
    return history.slice(0, limit)
}

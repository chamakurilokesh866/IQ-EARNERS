/**
 * Spins storage: Supabase with file fallback.
 * Tracks user spins per quiz.
 */
import { createServerSupabase } from "./supabase"
import { promises as fs } from "fs"
import path from "path"

const FILE_PATH = path.join(process.cwd(), "src", "data", "spins.json")

export type Spin = {
    id: string
    username: string
    quizId: string
    rewardType: "money" | "bad_luck" | "scratch_card"
    rewardValue: number
    created_at: number
}

async function readFromFile(): Promise<Spin[]> {
    try {
        const txt = await fs.readFile(FILE_PATH, "utf-8")
        const arr = JSON.parse(txt || "[]")
        return Array.isArray(arr) ? arr : []
    } catch {
        return []
    }
}

async function writeToFile(arr: Spin[]): Promise<boolean> {
    try {
        const dir = path.dirname(FILE_PATH)
        await fs.mkdir(dir, { recursive: true }).catch(() => { })
        await fs.writeFile(FILE_PATH, JSON.stringify(arr, null, 2), "utf-8")
        return true
    } catch {
        return false
    }
}

export async function getSpins(): Promise<Spin[]> {
    const supabase = createServerSupabase()
    if (supabase) {
        try {
            const { data, error } = await supabase.from("spins").select("*")
            if (!error && Array.isArray(data)) {
                return data.map((r: any) => ({
                    id: r.id,
                    username: r.username_lower,
                    quizId: r.quiz_id,
                    rewardType: r.reward_type,
                    rewardValue: Number(r.reward_value),
                    created_at: Number(r.created_at)
                }))
            }
        } catch { }
    }
    return readFromFile()
}

export async function getUserSpinForQuiz(username: string, quizId: string): Promise<Spin | null> {
    const arr = await getSpins()
    const lower = username.toLowerCase()
    return arr.find((s) => s.username === lower && s.quizId === quizId) ?? null
}

export async function addSpin(spin: Spin): Promise<{ ok: boolean; error?: string }> {
    const supabase = createServerSupabase()
    const now = Date.now()
    const entry = { ...spin, created_at: spin.created_at || now }

    if (supabase) {
        try {
            const { error } = await supabase.from("spins").insert({
                id: entry.id,
                username_lower: entry.username.toLowerCase(),
                quiz_id: entry.quizId,
                reward_type: entry.rewardType,
                reward_value: entry.rewardValue,
                created_at: entry.created_at
            })
            if (error && error.code === "23505") return { ok: false, error: "Already spun for this quiz" }
            return { ok: !error, error: error?.message }
        } catch (e: any) {
            return { ok: false, error: e.message }
        }
    }

    const arr = await readFromFile()
    const lower = entry.username.toLowerCase()
    if (arr.some((s) => s.username === lower && s.quizId === entry.quizId)) {
        return { ok: false, error: "Already spun for this quiz" }
    }
    arr.push(entry)
    const ok = await writeToFile(arr)
    return { ok }
}

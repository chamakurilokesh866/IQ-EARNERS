import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { requireAdmin } from "@/lib/auth"
import { rateLimit } from "@/lib/rateLimit"

const DATA_DIR = path.join(process.cwd(), "src", "data")

async function writeJSON(file: string, content: any) {
  const p = path.join(DATA_DIR, file)
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(content, null, 2), "utf-8")
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_RESET !== "true") {
    return NextResponse.json({ ok: false, error: "Reset disabled in production" }, { status: 403 })
  }
  const admin = await requireAdmin()
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status })
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 })
  try {
    // arrays to clear
    const arrays = [
      "profiles.json",
      "payments.json",
      "participants.json",
      "referrals.json",
      "tournaments.json",
      "quizzes.json",
      "prizes.json"
    ]
    await Promise.all(arrays.map((f) => writeJSON(f, [])))
    // defaults
    await writeJSON("ads.json", {
      enabled: false,
      frequency: 3,
      placements: ["home", "leaderboard", "prizes"],
      style: "card",
      providerUsername: "",
      providerKey: "",
      snippets: []
    })
    await writeJSON("settings.json", { entryFee: 100, currency: "₹" })
    const res = NextResponse.json({ ok: true })
    // clear cookies
    res.cookies.set("uid", "", { path: "/", maxAge: 0 })
    res.cookies.set("role", "", { path: "/", maxAge: 0 })
    return res
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? e)
    const isReadOnly = /EACCES|EROFS|EPERM|read-only|readonly/i.test(msg)
    const error = isReadOnly
      ? "Reset not available: File storage is read-only on serverless (Vercel). Use a deployment with persistent storage."
      : (msg || "reset failed")
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }
}

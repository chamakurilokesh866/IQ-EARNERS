import { promises as fs } from "fs"
import path from "path"

type AlertState = {
  lastAlertAt?: number
  lastFingerprint?: string
}

const FILE = path.join(process.cwd(), "src", "data", "proctoring-alert-state.json")

export async function readProctoringAlertState(): Promise<AlertState> {
  try {
    const txt = await fs.readFile(FILE, "utf-8")
    const parsed = JSON.parse(txt || "{}")
    return {
      lastAlertAt: Number(parsed?.lastAlertAt ?? 0) || 0,
      lastFingerprint: typeof parsed?.lastFingerprint === "string" ? parsed.lastFingerprint : ""
    }
  } catch {
    return {}
  }
}

export async function writeProctoringAlertState(next: AlertState): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true })
    await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf-8")
  } catch {
    // optional in read-only/serverless environments
  }
}

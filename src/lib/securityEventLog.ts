/**
 * Append-only security / ops events (webhook failures, verify denials, rate limits).
 * Stored under src/data; cap file size by trimming head.
 */
import { promises as fs } from "fs"
import path from "path"
import type { SecurityEvent } from "@/lib/securityEventTypes"

export type { SecurityEvent, SecurityEventType } from "@/lib/securityEventTypes"

const MAX_LINES = 500
const FILE = path.join(process.cwd(), "src", "data", "security-events.jsonl")

async function trimFileIfNeeded() {
  try {
    const txt = await fs.readFile(FILE, "utf-8")
    const lines = txt.split("\n").filter(Boolean)
    if (lines.length <= MAX_LINES) return
    const tail = lines.slice(-MAX_LINES)
    await fs.writeFile(FILE, tail.join("\n") + "\n", "utf-8")
  } catch {
    /* missing file */
  }
}

export async function appendSecurityEvent(event: Omit<SecurityEvent, "t"> & { t?: number }): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true })
    const line = JSON.stringify({ t: event.t ?? Date.now(), ...event } satisfies SecurityEvent) + "\n"
    await fs.appendFile(FILE, line, "utf-8")
    await trimFileIfNeeded()
  } catch {
    /* disk optional in some deploys */
  }
}

export async function readRecentSecurityEvents(limit = 200): Promise<SecurityEvent[]> {
  try {
    const txt = await fs.readFile(FILE, "utf-8")
    const lines = txt.split("\n").filter(Boolean)
    const out: SecurityEvent[] = []
    for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
      try {
        out.push(JSON.parse(lines[i]!) as SecurityEvent)
      } catch {
        /* skip bad line */
      }
    }
    return out
  } catch {
    return []
  }
}

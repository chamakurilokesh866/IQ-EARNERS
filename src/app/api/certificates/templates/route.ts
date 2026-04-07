import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"
import { promises as fs } from "fs"
import path from "path"

const TEMPLATES_PATH = path.join(process.cwd(), "src", "data", "certificate-templates.json")

function getTemplateData(data: Record<string, unknown>): { first: string; runnerUp: string; participation: string } {
  return {
    first: String(data.first ?? data.certFirst ?? ""),
    runnerUp: String(data.runnerUp ?? data.certRunnerUp ?? ""),
    participation: String(data.participation ?? data.certParticipation ?? "")
  }
}

export async function GET() {
  const settings = await getSettings()
  const fromSettings = getTemplateData(settings as Record<string, unknown>)
  if (fromSettings.first || fromSettings.runnerUp || fromSettings.participation) {
    return NextResponse.json({ ok: true, data: fromSettings }, {
      headers: { "Cache-Control": "public, max-age=60" }
    })
  }
  try {
    const txt = await fs.readFile(TEMPLATES_PATH, "utf-8")
    const fileData = JSON.parse(txt || "{}")
    return NextResponse.json({ ok: true, data: getTemplateData(fileData) }, {
      headers: { "Cache-Control": "public, max-age=60" }
    })
  } catch {
    return NextResponse.json({ ok: true, data: { first: "", runnerUp: "", participation: "" } }, {
      headers: { "Cache-Control": "public, max-age=60" }
    })
  }
}

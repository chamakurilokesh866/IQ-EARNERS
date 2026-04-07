import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSettings, updateSettings } from "@/lib/settings"

/** POST: Enable maintenance, trigger Vercel deploy hook, set estimated end time. */
export async function POST(req: Request) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const estimatedMinutes = Math.min(30, Math.max(1, Number(body?.estimatedMinutes) || 5))
    const message = typeof body?.message === "string" ? body.message.trim() : "We're deploying updates. The site will be back shortly."

    const until = Date.now() + estimatedMinutes * 60 * 1000
    await updateSettings({
      maintenanceMode: true,
      maintenanceMessage: message,
      maintenanceUntil: until
    })

    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL?.trim()
    if (deployHookUrl) {
      try {
        await fetch(deployHookUrl, { method: "POST" })
      } catch {
        // Deploy hook may fail; maintenance is still enabled
      }
    }

    return NextResponse.json({
      ok: true,
      message: deployHookUrl
        ? `Maintenance enabled. Deploy triggered. Est. ${estimatedMinutes} min.`
        : `Maintenance enabled. Set VERCEL_DEPLOY_HOOK_URL to trigger deploy.`
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

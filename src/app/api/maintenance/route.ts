import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"

export async function GET() {
  try {
    const data = await getSettings()
    const maintenance = Boolean(data.maintenanceMode)
    return NextResponse.json({
      maintenance,
      message: typeof data.maintenanceMessage === "string" ? data.maintenanceMessage : undefined,
      until: typeof data.maintenanceUntil === "number" ? data.maintenanceUntil : undefined
    }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
    })
  } catch {
    return NextResponse.json({ maintenance: false }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
    })
  }
}

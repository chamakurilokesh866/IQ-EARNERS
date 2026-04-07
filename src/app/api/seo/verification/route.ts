import { NextResponse } from "next/server"
import { getSettings } from "@/lib/settings"

/**
 * Public API – returns SEO verification codes for meta tag injection.
 * Used by SeoVerificationMeta to wire up Google, Bing, Yandex verification.
 */
export async function GET() {
  try {
    const settings = await getSettings()
    const v = settings.seoVerification as { google?: string; bing?: string; yandex?: string } | undefined
    const data = {
      google: typeof v?.google === "string" && v.google.trim() ? v.google.trim() : undefined,
      bing: typeof v?.bing === "string" && v.bing.trim() ? v.bing.trim() : undefined,
      yandex: typeof v?.yandex === "string" && v.yandex.trim() ? v.yandex.trim() : undefined,
    }
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch {
    return NextResponse.json({ google: undefined, bing: undefined, yandex: undefined })
  }
}

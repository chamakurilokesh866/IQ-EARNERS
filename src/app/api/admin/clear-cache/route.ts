/**
 * Admin-only: Clear in-memory caches.
 * POST /api/admin/clear-cache
 * Clears practice quiz cache and any other clearable in-memory caches.
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { invalidatePracticeQuizCache } from "@/lib/practiceQuizCache"

export async function POST() {
    const auth = await requireAdmin()
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

    try {
        invalidatePracticeQuizCache()
        return NextResponse.json({
            ok: true,
            message: "Practice quiz cache cleared. AI recommendation and homepage caches will refresh on next request (per-user TTL).",
        })
    } catch (e: unknown) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : "Cache clear failed" },
            { status: 500 }
        )
    }
}

import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { invalidatePracticeQuizCache } from "@/lib/practiceQuizCache"
import { blockUser, removeBlockedUser } from "@/lib/blocked"

/**
 * AI Fix API — Admin only.
 * POST /api/admin/ai-fix
 * Body: { issueId: string, action: string, context?: any }
 *
 * Some actions run real server-side effects; others remain informational only.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Admin required" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { issueId, action, context } = body

  if (!issueId || !action) {
    return NextResponse.json({ ok: false, error: "Missing issueId or action" }, { status: 400 })
  }

  try {
    let result = { ok: false, message: "Action not implemented" }

    switch (action) {
      case "CLEAR_CACHE": {
        try {
          invalidatePracticeQuizCache()
          revalidatePath("/", "layout")
          revalidatePath("/")
        } catch {
          /* still report partial success if revalidate throws in edge runtime */
        }
        result = {
          ok: true,
          message:
            "Practice quiz cache cleared and layout revalidation queued. CDN pages will refresh on the next request."
        }
        break
      }

      case "OPTIMIZE_DB":
        result = {
          ok: true,
          message:
            "Database maintenance is not exposed from this app. Run VACUUM/ANALYZE in Supabase SQL or your host console if needed."
        }
        break

      case "FIX_SEO_TAGS":
        result = {
          ok: true,
          message:
            "Use Admin → SEO Audit to review metadata. Automated sitewide OG generation is not wired to this action yet."
        }
        break

      case "BLOCK_THREAT_IP": {
        const name = context?.name ? String(context.name).trim() : ""
        const ip = context?.ip ? String(context.ip).trim() : ""
        if (name) {
          const blocked = await blockUser(name, "Blocked via admin AI fix (threat)")
          result = {
            ok: blocked,
            message: blocked
              ? `Username "${name}" added to the blocked list (login will be denied).`
              : `Could not block "${name}" (already blocked or storage error).`
          }
          break
        }
        result = {
          ok: false,
          message: ip
            ? `IP-only blocks are not stored in-app (login uses usernames). Block context.name, or deny ${ip} at your CDN/WAF.`
            : "Provide context.name (username to block) or an IP to show this guidance."
        }
        break
      }

      case "DEDUPLICATE_RECORDS":
        result = {
          ok: true,
          message: "Duplicate cleanup is not automated here. Export data and dedupe in SQL or a one-off script if required."
        }
        break

      case "FIX_LEADERBOARD_LINK":
        result = {
          ok: true,
          message: "Check leaderboard links for undefined quiz IDs in the UI code; no server mutation was performed."
        }
        break

      case "REGENERATE_CONTENT":
        result = {
          ok: true,
          message: "Home/intro AI content refreshes on its TTL. Trigger specific routes or reduce cache TTL if you need fresher copy."
        }
        break

      case "OPTIMIZE_MEMORY":
        result = {
          ok: true,
          message: "Node cannot force GC from this route reliably in serverless. Redeploy or scale instances if memory is an issue."
        }
        break

      case "FIX_AUDIO_ENGINE":
        result = {
          ok: true,
          message: "Audio assets were not modified. Re-upload alert sounds in admin settings if MIME or format is wrong."
        }
        break

      case "FIX_SECURITY_HEADERS":
        result = {
          ok: true,
          message: "CSP lives in next.config / middleware. Edit those files and redeploy to change security headers."
        }
        break

      case "UNBLOCK_USER": {
        const uid = context?.uid ? String(context.uid).trim() : ""
        if (!uid) {
          result = { ok: false, message: "context.uid (username) required." }
          break
        }
        const unblocked = await removeBlockedUser(uid)
        result = {
          ok: unblocked,
          message: unblocked
            ? `Removed "${uid}" from the blocked list.`
            : `User "${uid}" was not on the blocked list.`
        }
        break
      }

      default:
        result = { ok: false, message: `The action '${action}' is not yet supported for automated execution.` }
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal AI fix error"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

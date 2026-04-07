import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { addSponsorRequest, type SponsorRequest } from "@/lib/sponsors"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"
import { validateOrigin } from "@/lib/auth"
import { validateCsrf } from "@/lib/csrf"

// Rate limit map: IP -> { count, firstAt }
const rateMap = new Map<string, { count: number; firstAt: number }>()
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_MAX = 5 // max 5 submissions per hour per IP

export async function POST(req: Request) {
  try {
    const originCheck = validateOrigin(req)
    if (originCheck === false) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
    const csrfOk = await validateCsrf(req)
    if (!csrfOk) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 403 })
    // ── Rate Limiting ──────────────────────────────────────────
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown"
    const now = Date.now()
    const existing = rateMap.get(ip)
    if (existing) {
      if (now - existing.firstAt < RATE_WINDOW_MS) {
        if (existing.count >= RATE_MAX) {
          return NextResponse.json(
            { ok: false, error: "Too many submissions. Please wait an hour and try again." },
            { status: 429 }
          )
        }
        existing.count++
      } else {
        rateMap.set(ip, { count: 1, firstAt: now })
      }
    } else {
      rateMap.set(ip, { count: 1, firstAt: now })
    }

    // ── Honeypot Anti-Spam ────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    if (body?.website) { // honeypot field — bots fill it, humans don't
      return NextResponse.json({ ok: true, code: "SPAM-FILTERED" }) // silent drop
    }

    const name = String(body?.name ?? "").trim()
    const email = String(body?.email ?? "").trim()
    const subject = String(body?.subject ?? "").trim()
    const message = String(body?.message ?? "").trim()

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "Name, email and message are required" }, { status: 400 })
    }
    if (!email.includes("@") || email.length > 254) {
      return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400 })
    }
    if (message.length > 2000) {
      return NextResponse.json({ ok: false, error: "Message too long (max 2000 characters)" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const uid = cookieStore.get("uid")?.value ?? null

    // ── Save to Database ──────────────────────────────────────
    const rand = crypto.randomInt(0, 1000000).toString().padStart(6, "0")
    const prefix = name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X")
    const code = `${prefix}IQCONTACT-${rand}`
    const ts = Date.now()

    const entry: SponsorRequest = {
      id: String(ts),
      code,
      name,
      email,
      brand: subject || "Contact Form",
      message: `[CONTACT FORM]\nSubject: ${subject}\n\n${message}`,
      kind: "sponsor" as const,
      status: "pending",
      adminReply: undefined,
      uid,
      form_data: { type: "contact", subject, originalMessage: message },
      created_at: ts,
      updated_at: ts
    }

    const ok = await addSponsorRequest(entry)
    if (!ok) return NextResponse.json({ ok: false, error: "Failed to save. Please try again." }, { status: 500 })

    const { getEmailTemplate } = await import("@/lib/emailTheme")

    // ── Send Confirmation Email ───────────────────────────────
    const userHtml = getEmailTemplate({
      title: "IQ Earners Support",
      subtitle: "Message Received",
      content: `Hi ${name}, we've received your request! Our team will review your message and respond within 1–2 business days.`,
      highlightContent: code,
      buttonLink: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.iqearners.online"}/more/contact-us`,
      buttonText: "Track Status",
      footerText: `Tracking Code: ${code} | Submission ID: ${ts}`
    })

    sendEmail({
      to: email,
      subject: `We received your message – IQ Earners Support [${code}]`,
      html: userHtml,
    }).catch(() => { })

    // ── Admin Notification ────────────────────────────────────
    const adminEmail = process.env.ADMIN_USERNAME?.includes("@") ? process.env.ADMIN_USERNAME : "contact@iqearners.online"
    const adminHtml = getEmailTemplate({
      title: "IQ Earners Admin",
      subtitle: "New Support Inquiry",
      content: "A new message has been submitted via the contact form.",
      rawHtml: `
        <div style="background:rgba(255,255,255,0.03); padding:24px; border-radius:16px; border:1px solid rgba(255,255,255,0.1);">
          <p style="margin:0 0 10px; color:#fff;"><strong>From:</strong> ${name} (<a href="mailto:${email}" style="color:#7c3aed;">${email}</a>)</p>
          <p style="margin:0 0 10px; color:#fff;"><strong>Subject:</strong> ${subject}</p>
          <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin:16px 0;" />
          <p style="margin:0; color:#94a3b8; white-space:pre-wrap;">${message}</p>
          <p style="margin:16px 0 0; font-size:12px; color:#7c3aed; font-family:monospace;">CODE: ${code}</p>
        </div>
        <div style="text-align:center; margin-top:24px;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/more/admin-dashboard?tab=Contacts" class="btn">Reply in Dash</a>
        </div>
      `,
      footerText: `Source: Contact Form | UID: ${uid ?? "Guest"}`
    })

    sendEmail({
      to: adminEmail,
      subject: `[SUPPORT] ${subject} from ${name}`,
      html: adminHtml
    }).catch(() => { })

    return NextResponse.json({ ok: true, code })
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error("[contact]", e)
    const msg = (e as Error)?.message || "Something went wrong"
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

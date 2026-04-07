/**
 * Email sending via Resend SDK.
 * Set RESEND_API_KEY in env (use the token from Resend dashboard or from api-keys create response).
 * From address: verified domain in Resend or onboarding@resend.dev for testing.
 *
 * Controlled by admin setting `useResendEmails` in settings:
 * - false (default): do not call Resend; callers should fall back to manual OTP / no-email flows.
 * - true: send emails via Resend.
 */
import { Resend } from "resend"
import { getSettings } from "./settings"

const DEFAULT_FROM = process.env.RESEND_FROM ?? "IQ Earners <onboarding@resend.dev>"

export type SendEmailOptions = {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  // Check admin toggle first – default is off until domain is ready.
  try {
    const settings = await getSettings()
    if (settings && settings.useResendEmails === false) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[email] Email sending disabled via admin settings (useResendEmails=false)")
      }
      return { ok: false, error: "Email sending disabled by admin" }
    }
  } catch {
    // If settings cannot be loaded, continue and let normal error handling apply.
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey?.trim()) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] RESEND_API_KEY not set, skipping send")
      return { ok: true }
    }
    return { ok: false, error: "Email not configured" }
  }
  const to = Array.isArray(options.to) ? options.to : [options.to]
  if (to.length === 0 || !to.every((e) => typeof e === "string" && e.includes("@"))) {
    return { ok: false, error: "Invalid recipient" }
  }
  try {
    const resend = new Resend(apiKey)
    const payload = {
      from: options.from ?? DEFAULT_FROM,
      to,
      subject: options.subject,
      ...(options.html ? { html: options.html } : {}),
      ...(options.text ? { text: options.text } : {}),
    }
    const { data, error } = await resend.emails.send(payload as any)
    if (error) {
      return {
        ok: false,
        error:
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : String(error),
      }
    }
    return { ok: true, id: data?.id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed"
    return { ok: false, error: msg }
  }
}

export function getLoginUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.iqearners.online"
  return `${base.replace(/\/$/, "")}/intro`
}

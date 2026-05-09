import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { cookieOptions } from "@/lib/cookieOptions"
import { rateLimit } from "@/lib/rateLimit"
import { getProfiles, getProfileByUid, getProfileByUsername, getProfileByEmail, upsertProfile, generateMemberId, formatReferralCode, updateProfileWallet, type Profile } from "@/lib/profiles"
import { findPayment, updatePayment } from "@/lib/payments"
import { verifyUsernameToken } from "@/lib/usernameToken"
import { hashPassword } from "@/lib/password"
import { isOtpVerified, consumeOtp, validateToken } from "@/lib/createUsernameOtp"
import { sendEmail, getLoginUrl } from "@/lib/email"
import crypto from "crypto"
import { validateCsrf } from "@/lib/csrf"
import { PARENT_COMPANY_NAME } from "@/lib/seo"
import { isCashfreeOrderPaidLive, syncCashfreeOrderIfPaid } from "@/lib/cashfreeSyncOrder"

export async function GET() {
  const cookieStore = await cookies()
  const uid = cookieStore.get("uid")?.value ?? ""
  let prof: Profile | null = uid ? await getProfileByUid(uid) : null
  const pattern = /^IQREF-\d+-\d{3}$/
  if (prof && ((!prof.referralCode || typeof prof.wallet !== "number") || !pattern.test(String(prof.referralCode)))) {
    const referralCode = prof.referralCode || (await ensureReferralCode(prof))
    const wallet = typeof prof.wallet === "number" ? prof.wallet : 0
    prof = { ...prof, referralCode, wallet }
    await upsertProfile(prof)
  }
  return NextResponse.json({ ok: true, data: prof ?? null })
}

async function ensureReferralCode(prof: Profile): Promise<string> {
  const arr = await getProfiles()
  const taken = new Set(arr.map((p) => String(p.referralCode ?? "")))
  for (let i = 10001; i < 99999; i++) {
    const c = formatReferralCode(i)
    if (!taken.has(c)) return c
  }
  return formatReferralCode(Number(Date.now().toString().slice(-5)))
}

async function verifyAndConsumeToken(token: string): Promise<{ paymentId: string } | null> {
  const payload = verifyUsernameToken(token)
  if (!payload) return null
  let payment = payload.p
    ? await findPayment({ paymentId: payload.p })
    : await findPayment({ orderId: payload.o })
  if (payment && payment.status === "pending" && payment.gateway === "cashfree") {
    const orderForSync = (payload.o || payment.orderId || payment.cashfreeOrderId || "").trim()
    if (orderForSync) {
      const tid = typeof (payment.meta as Record<string, unknown> | undefined)?.tournamentId === "string"
        ? String((payment.meta as Record<string, unknown>).tournamentId)
        : null
      await syncCashfreeOrderIfPaid(orderForSync, tid)
      payment = payload.p ? await findPayment({ paymentId: payload.p }) : await findPayment({ orderId: payload.o })
    }
  }
  if (payment?.gateway === "cashfree") {
    const oid = (payload.o || payment.orderId || payment.cashfreeOrderId || payment.paymentSessionId || "").trim()
    if (oid && !(await isCashfreeOrderPaidLive(oid))) return null
  }
  if (!payment || payment.status !== "success" || payment.profileId) return null
  return { paymentId: payment.id }
}

export async function POST(req: Request) {
  const csrfOk = await validateCsrf(req)
  if (!csrfOk) return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 403 })
  const rl = await rateLimit(req, "api")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many requests", retryAfter: rl.retryAfter }, { status: 429 })
  const body = await req.json().catch(() => ({}))
  const username = String(body?.username ?? "").trim()
  const emailRaw = typeof body?.email === "string" ? body.email.trim() : ""
  const email = emailRaw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw.toLowerCase() : undefined
  const country = typeof body?.country === "string" && body.country.length === 2 ? body.country.toUpperCase() : (body?.country === "OTHER" ? "OTHER" : undefined)
  const createUsernameToken = typeof body?.createUsernameToken === "string" ? body.createUsernameToken.trim() : ""
  const rawPassword = typeof body?.password === "string" ? body.password : ""

  if (!username) return NextResponse.json({ ok: false, error: "username required" }, { status: 400 })
  const allowed = /^[A-Za-z0-9._\-@]{6,20}$/
  if (!allowed.test(username)) return NextResponse.json({ ok: false, error: "invalid_username" }, { status: 400 })
  if (!/[A-Z]/.test(username)) return NextResponse.json({ ok: false, error: "invalid_username" }, { status: 400 })
  if (!/[a-z]/.test(username)) return NextResponse.json({ ok: false, error: "invalid_username" }, { status: 400 })
  if (!/\d/.test(username)) return NextResponse.json({ ok: false, error: "invalid_username" }, { status: 400 })
  if (!/[._\-@]/.test(username)) return NextResponse.json({ ok: false, error: "invalid_username" }, { status: 400 })
  if (/^[._\-@]|[._\-@]$/.test(username)) return NextResponse.json({ ok: false, error: "invalid_username" }, { status: 400 })
  const cookieStore = await cookies()
  const currentUid = cookieStore.get("uid")?.value
  const uid = currentUid ?? crypto.randomBytes(16).toString("hex")
  const current = await getProfileByUid(uid)
  const isNewUser = !current

  if (isNewUser) {
    if (!emailRaw) return NextResponse.json({ ok: false, error: "Email is required to create an account" }, { status: 400 })
    if (!rawPassword || rawPassword.length < 6) return NextResponse.json({ ok: false, error: "Password must be at least 6 characters" }, { status: 400 })
    if (!/[A-Z]/.test(rawPassword)) return NextResponse.json({ ok: false, error: "Password must contain at least one capital letter" }, { status: 400 })
    if (!/\d/.test(rawPassword)) return NextResponse.json({ ok: false, error: "Password must contain at least one number" }, { status: 400 })
    if (!/[._\-@!?#$%&*]/.test(rawPassword)) return NextResponse.json({ ok: false, error: "Password must contain at least one special character (. _ - @ ! ? # $ % & *)" }, { status: 400 })
  }

  const existing = await getProfileByUsername(username)
  if (existing && existing.uid !== currentUid) return NextResponse.json({ ok: false, error: "username_taken" }, { status: 409 })

  if (emailRaw) {
    if (!email) return NextResponse.json({ ok: false, error: "Invalid email format" }, { status: 400 })
    const domain = email.split("@")[1];
    const BLOCKED_DOMAINS = ["tempmail.com", "yopmail.com", "guerrillamail.com", "mailinator.com", "10minutemail.com", "temp-mail.org", "throwawaymail.com", "yopmail.fr", "yopmail.net", "dispostable.com", "mailinator.net"];
    if (BLOCKED_DOMAINS.includes(domain)) {
      return NextResponse.json({ ok: false, error: "Temporary emails are not allowed" }, { status: 400 })
    }
    const existingEmailProfile = await getProfileByEmail(email)
    if (existingEmailProfile && existingEmailProfile.uid !== currentUid) {
      return NextResponse.json({ ok: false, error: "Email is already registered to another account" }, { status: 409 })
    }
  }

  let tokenPaymentId: string | null = null

  if (!current) {
    // New accounts: only after Cashfree success (webhook/sync) or admin-approved manual payment.
    // No client-supplied paymentProof — prevents forged orderIds and back-navigation replay.
    if (!createUsernameToken || !createUsernameToken.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Use the secure link from your payment confirmation to create your account."
        },
        { status: 403 }
      )
    }
    if (!validateToken(createUsernameToken)) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 })
    }
    const otpVerified = await isOtpVerified(createUsernameToken)
    if (!otpVerified) {
      return NextResponse.json({ ok: false, error: "OTP verification required. Verify your email first." }, { status: 403 })
    }
    const tokenResult = await verifyAndConsumeToken(createUsernameToken)
    if (!tokenResult) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token. Complete payment again." }, { status: 403 })
    }
    await consumeOtp(createUsernameToken)
    tokenPaymentId = tokenResult.paymentId
  }
  const createdAfterPayment = !!tokenPaymentId
  const entry: Profile = {
    uid,
    username,
    ...(email && { email }),
    country,
    referralCode: current?.referralCode ?? (await ensureReferralCode({ uid, username })),
    wallet: typeof current?.wallet === "number" ? current.wallet : 0,
    updated_at: Date.now(),
    ...(createdAfterPayment && {
      paid: "P",
      memberId: await generateMemberId()
    })
  }
  if (isNewUser && rawPassword) {
    entry.passwordHash = hashPassword(rawPassword)
  }
  const ok = await upsertProfile(entry)
  if (!ok) return NextResponse.json({ ok: false, error: "Failed to save" }, { status: 500 })

  if (isNewUser && email && username) {
    const loginUrl = getLoginUrl()
    const { getEmailTemplate } = await import("@/lib/emailTheme")
    const htmlTemplate = getEmailTemplate({
      title: "IQ Earners",
      subtitle: `Welcome, ${username}!`,
      content:
        "Hi there — your IQ Earners account is <strong>live</strong>. Use the username below to sign in with the password you just created. We're excited to have you in daily quizzes, tournaments, and rewards.",
      highlightLabel: "Your login username",
      highlightContent: username,
      buttonLink: loginUrl,
      buttonText: "Open login",
      footerText:
        `Greetings from the IQ Earners team (${PARENT_COMPANY_NAME}). Need help? Reply to this email anytime.`,
      theme: "celebration"
    })
    sendEmail({
      to: email,
      subject: `Welcome to IQ Earners — you're in, @${username}`,
      html: htmlTemplate,
      text: `Hi! Your IQ Earners username is: ${username}\n\nLog in here: ${loginUrl}\n\nUse this username and the password you created when signing up.\n\n— IQ Earners · ${PARENT_COMPANY_NAME}`
    }).catch((e) => console.error("Failed to send welcome email", e))
  }

  if (tokenPaymentId) {
    const pmt = await findPayment({ paymentId: tokenPaymentId })
    const meta = { ...((pmt?.meta || {}) as Record<string, unknown>), username }
    await updatePayment(tokenPaymentId, { profileId: uid, meta })
  }

  // Handle tournament enrollment directly if provided
  const tournamentId = typeof body?.tournamentId === "string" ? body.tournamentId.trim() : ""
  if (tournamentId && createdAfterPayment) {
    try {
      const { getTournaments, updateTournament } = await import("@/lib/tournaments")
      const { getLeaderboard, upsertByName } = await import("@/lib/leaderboard")
      const { addEnrollment, isEnrolled } = await import("@/lib/enrollments")
      const { generateEnrollmentCode } = await import("@/lib/enrollmentCode")
      const path = await import("path")
      const { promises: fs } = await import("fs")

      const tournaments = await getTournaments()
      const tournament = tournaments.find((t: any) => t.id === tournamentId)
      if (tournament) {
        const already = await isEnrolled(username, tournamentId)
        if (!already) {
          await addEnrollment({ username, tournamentId, paidAt: Date.now(), uniqueCode: generateEnrollmentCode(tournamentId) })
          const existingLB = await getLeaderboard(tournamentId)
          if (!existingLB.some((p: any) => String(p?.name).toLowerCase() === username.toLowerCase())) {
            await upsertByName({ name: username, score: 0, country: entry.country || "IN", tournamentId })
          }
          const DATA_DIR = path.join(process.cwd(), "src", "data")
          const partPath = path.join(DATA_DIR, "participants.json")
          const participantsRaw = await fs.readFile(partPath, "utf-8").catch(() => "[]")
          const participants = JSON.parse(participantsRaw || "[]")
          if (!participants.some((p: any) => String(p?.name).toLowerCase() === username.toLowerCase())) {
            participants.push({ id: String(Date.now()), name: username, joinedAt: Date.now(), status: "Active" })
            await fs.writeFile(partPath, JSON.stringify(participants, null, 2), "utf-8")
          }
          await updateTournament(tournamentId, { enrolled: (tournament.enrolled ?? 0) + 1 })
        }
      }
    } catch (e) {
      console.error("Auto-enrollment failed", e)
    }
  }

  // Handle referrals directly on the backend to avoid race conditions
  if (createdAfterPayment) {
    try {
      const { findPendingReferralsByReferred, updateReferral, addReferral } = await import("@/lib/referrals")
      const { getProfileByReferralCode } = await import("@/lib/profiles")

      const refcode = cookieStore.get("refcode")?.value ?? ""
      if (refcode) {
        const referrer = await getProfileByReferralCode(refcode)
        if (referrer && referrer.uid !== uid) {
          const existingRefs = await findPendingReferralsByReferred(uid, username)
          if (existingRefs.length === 0) {
            // Create and credit immediately
            await addReferral({
              id: String(Date.now()),
              referrerUid: referrer.uid,
              referrerCode: refcode,
              referredUid: uid,
              referredUsername: username,
              status: "credited",
              amount: 50,
              created_at: Date.now()
            })
            await updateProfileWallet(referrer.uid, 50)
          }
        }
      }

      // Process any existing pending referrals
      const pendingRefs = await findPendingReferralsByReferred(uid, username)
      for (const ref of pendingRefs) {
        await updateReferral(ref.id, { status: "credited", referredUsername: username, updated_at: Date.now() })
        await updateProfileWallet(ref.referrerUid, Number(ref.amount ?? 50))
      }
    } catch { }
  }

  const res = NextResponse.json({ ok: true, data: entry })
  const cookieOpts = cookieOptions({ maxAge: 60 * 60 * 24 * 365 })
  const setUid = !cookieStore.get("uid")?.value
  const setPaid = !cookieStore.get("paid")?.value && !!tokenPaymentId
  if (setUid) res.cookies.set("uid", uid, cookieOpts)
  if (setPaid) res.cookies.set("paid", "1", cookieOpts)
  if (setUid || setPaid) res.cookies.set("hs", "1", { ...cookieOpts, httpOnly: false })
  return res
}

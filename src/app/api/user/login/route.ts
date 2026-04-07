import { NextResponse } from "next/server"
import crypto from "crypto"
import { rateLimit } from "@/lib/rateLimit"
import { cookieOptions } from "@/lib/cookieOptions"
import { getProfileByUsername, getProfileByUid, getProfileByEmail, upsertProfile, getProfiles, generateMemberId, formatReferralCode } from "@/lib/profiles"
import { getPayments, updatePayment } from "@/lib/payments"
import { isBlocked } from "@/lib/blocked"
import { verifyPassword } from "@/lib/password"
import { verifyTurnstile } from "@/lib/turnstile"
import { startSession } from "@/lib/activeSessions"

function getMetaUsername(meta: Record<string, unknown> | undefined): string {
  if (!meta) return ""
  return String(
    (meta.username ?? meta.name ?? meta.customerName ?? "") as string
  ).trim()
}

export async function POST(req: Request) {
  const rl = await rateLimit(req, "login")
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too many attempts", retryAfter: rl.retryAfter }, { status: 429 })
  try {
    const body = await req.json().catch(() => ({}))
    const usernameOrEmail = String(body?.username ?? "").trim()
    const password = String(body?.password ?? "").trim()
    const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken.trim() : ""
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "").split(",")[0] || null

    const turnstileResult = await verifyTurnstile(turnstileToken, ip)
    if (!turnstileResult.success) {
      return NextResponse.json({ ok: false, error: "Verification failed. Please try again." }, { status: 400 })
    }

    if (!usernameOrEmail) {
      return NextResponse.json({ ok: false, error: "Username or email is required" }, { status: 400 })
    }

    const isEmail = usernameOrEmail.includes("@")
    let user = isEmail
      ? await getProfileByEmail(usernameOrEmail)
      : await getProfileByUsername(usernameOrEmail)
    if (!user && !isEmail) user = await getProfileByEmail(usernameOrEmail)
    if (!user && isEmail) user = await getProfileByUsername(usernameOrEmail)
    const loginIdentifier = user?.username ?? usernameOrEmail
    const blocked = await isBlocked(loginIdentifier)
    if (blocked) {
      const res = NextResponse.json({
        ok: false,
        blocked: true,
        blockKey: "B",
        reason: blocked.reason || "Your account has been blocked.",
        username: blocked.username
      }, { status: 403 })
      res.cookies.set("blocked", "B", { path: "/", maxAge: 60 * 60 * 24, httpOnly: false })
      res.cookies.set("blocked_username", encodeURIComponent(blocked.username), { path: "/", maxAge: 60 * 60 * 24, httpOnly: false })
      return res
    }

    const adminUsername = (process.env.ADMIN_USERNAME ?? "").trim()
    const adminPassword = (process.env.ADMIN_PASSWORD ?? "").trim()
    if (adminUsername && usernameOrEmail.toLowerCase() === adminUsername.toLowerCase()) {
      if (password && adminPassword && password === adminPassword) {
        const { createAdminSession, setAdminSessionCookie } = await import("@/lib/adminSession")
        const signed = createAdminSession()
        const res = NextResponse.json({ ok: true, step: "otp" })
        setAdminSessionCookie(res, signed)
        return res
      }
      return NextResponse.json({ ok: true, needsPassword: true })
    }

    if (!user) {
      const payments = await getPayments()
      const unameLower = usernameOrEmail.toLowerCase()
      for (const p of payments) {
        if (p.status !== "success") continue
        if (p.profileId) {
          const prof = await getProfileByUid(p.profileId)
          if (prof && String(prof.username || "").toLowerCase() === unameLower) {
            user = prof
            break
          }
        }
      }
      const matchingPayment = !user
        ? payments.find(
          (p) =>
            p.status === "success" &&
            unameLower === getMetaUsername(p.meta).toLowerCase()
        )
        : null
      if (!user && matchingPayment) {
        const uid = matchingPayment.profileId ?? crypto.randomBytes(16).toString("hex")
        const profiles = await getProfiles()
        const taken = new Set(profiles.map((p) => String(p.referralCode ?? "")))
        let referralCode = ""
        for (let i = 10001; i < 99999; i++) {
          const c = formatReferralCode(i)
          if (!taken.has(c)) {
            referralCode = c
            break
          }
        }
        if (!referralCode) referralCode = formatReferralCode(Number(Date.now().toString().slice(-5)))
        const entryUsername = getMetaUsername(matchingPayment.meta) || usernameOrEmail
        const entry = {
          uid,
          username: entryUsername,
          referralCode,
          wallet: 0,
          updated_at: Date.now(),
          paid: "P" as const,
          memberId: await generateMemberId()
        }
        const ok = await upsertProfile(entry)
        if (ok) {
          user = entry
          if (!matchingPayment.profileId) {
            await updatePayment(matchingPayment.id, { profileId: uid })
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 })
    }

    if (user.passwordHash) {
      if (!password) {
        return NextResponse.json({ ok: false, error: "Password is required" }, { status: 400 })
      }
      if (!verifyPassword(password, user.passwordHash)) {
        return NextResponse.json({ ok: false, error: "Invalid username or password" }, { status: 401 })
      }
    } else {
      const allPayments = await getPayments()
      const p = allPayments.find(pay => pay.profileId === user?.uid && pay.status === "success")
      if (p) {
        const pId = p.id
        const orderId = p.orderId ?? p.cashfreeOrderId ?? p.paymentSessionId ?? undefined
        const { signUsernameToken } = await import("@/lib/usernameToken")
        const token = signUsernameToken(orderId, pId)
        if (token) {
          return NextResponse.json({ ok: true, redirectTo: `/create-username?token=${token}` })
        }
      }
      return NextResponse.json({ ok: false, error: "Set up your account first. Use the link sent after payment to create your username and password." }, { status: 400 })
    }

    // Single active session: startSession logs out any prior sid for this uid (new login wins).

    const res = NextResponse.json({ ok: true, data: user })
    const opts = cookieOptions({ maxAge: 60 * 60 * 24 * 365 })
    res.cookies.set("uid", user.uid, opts)
    if (user.username) {
      res.cookies.set("username", encodeURIComponent(user.username), opts)
    }
    res.cookies.set("paid", "1", opts)
    const sid = crypto.randomBytes(16).toString("hex")
    res.cookies.set("sid", sid, opts)
    res.cookies.set("hs", "1", { ...opts, httpOnly: false })

    if (user.uid) {
      const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "").split(",")[0] || null
      const userAgent = req.headers.get("user-agent") || null
      await startSession({ uid: user.uid, sid, ip, userAgent })
    }

    return res
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Login error:", error)
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 })
  }
}

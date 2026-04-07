import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getPayments, updatePayment } from "@/lib/payments"
import { getProfileByUsername, getProfileByUid, updateProfileWallet } from "@/lib/profiles"
import { getLeaderboard, upsertByName } from "@/lib/leaderboard"
import { findPendingReferralsByReferred, updateReferral } from "@/lib/referrals"
import { unblockUser } from "@/lib/blocked"
import { unblockIp } from "@/lib/inspectSecurity"
import { recordUnblocked } from "@/lib/unblocked"
import { addEnrollment, isEnrolled } from "@/lib/enrollments"
import { generateEnrollmentCode } from "@/lib/enrollmentCode"
import { audit } from "@/lib/audit"
import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "src", "data")
const PARTICIPANTS = path.join(DATA_DIR, "participants.json")

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  if (cookieStore.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ ok: false, error: "Not found" }, { status: 400 })

  const arr = await getPayments()
  const rec = arr.find((p: { id: string }) => p.id === id)
  if (!rec) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 })
  if (rec.status !== "pending_approval") {
    return NextResponse.json({ ok: false, error: "Not pending" }, { status: 400 })
  }

  const meta = (rec.meta || {}) as Record<string, unknown>
  let username = String(meta?.name ?? meta?.username ?? "").trim()
  let referredUid = (rec as any).profileId ?? ""
  if (referredUid) {
    const prof = await getProfileByUid(referredUid)
    if (prof?.username) username = prof.username
  } else if (username) {
    const prof = await getProfileByUsername(username)
    if (prof) referredUid = prof.uid
  }
  const isPlaceholder = !username || username.toLowerCase() === "participant" || username.length < 2
  if (username && !isPlaceholder) {
    try {
      if (rec?.type === "tournament_entry" && (rec as any).tournamentId) {
        const tid = (rec as any).tournamentId
        const alreadyEnrolled = await isEnrolled(username, tid)
        if (!alreadyEnrolled) {
          await addEnrollment({
            username,
            tournamentId: tid,
            paidAt: Date.now(),
            uniqueCode: generateEnrollmentCode(tid)
          })
        }
        const prof = await getProfileByUsername(username)
        const country = (meta as any)?.country || prof?.country || "IN"
        await upsertByName({ name: username, score: 0, tournamentId: (rec as any).tournamentId, country })
      }
      if (rec?.type === "tournament" || rec?.gateway === "qr") {
        const existing = await getLeaderboard()
        if (!existing.some((p: any) => String(p?.name ?? "").toLowerCase() === username.toLowerCase())) {
          const prof = await getProfileByUsername(username)
          const country = (meta as any)?.country || prof?.country || "IN"
          await upsertByName({ name: username, score: 0, country })
        }
      }
      const ptxt = await fs.readFile(PARTICIPANTS, "utf-8").catch(() => "[]")
      const participants: any[] = JSON.parse(ptxt || "[]")
      if (!participants.some((p: any) => String(p?.name ?? "").toLowerCase() === username.toLowerCase())) {
        participants.push({ id: String(Date.now()), name: username, joinedAt: Date.now(), status: "Active" })
        await fs.writeFile(PARTICIPANTS, JSON.stringify(participants, null, 2), "utf-8")
      }
    } catch {
      // File writes may fail on Vercel; payment update already succeeded
    }
  }

  if (rec?.type === "inspect_unblock") {
    const unblockForIp = String(meta?.unblockIp ?? "").trim()
    if (unblockForIp) await unblockIp(unblockForIp)
  }

  // For unblock: remove from blocked DB FIRST so user sees unblocking → congrats quickly
  if (rec?.type === "unblock") {
    const unblockFor = String((meta?.unblockFor ?? meta?.name ?? "")).trim()
    if (unblockFor) {
      const now = Date.now()
      const statsUpdate = (async () => {
        try {
          const statsPath = path.join(DATA_DIR, "user-stats.json")
          const txt = await fs.readFile(statsPath, "utf-8").catch(() => "{}")
          const all: Record<string, any> = JSON.parse(txt || "{}")
          const key = unblockFor.toLowerCase()
          if (all[key]) {
            delete all[key].blocked
            delete all[key].blockReason
            await fs.writeFile(statsPath, JSON.stringify(all, null, 2), "utf-8")
          }
        } catch { }
      })()
      await Promise.all([unblockUser(unblockFor), recordUnblocked(unblockFor, now), statsUpdate])
    }
  }

  const now = Date.now()
  await updatePayment(id, {
    status: "success",
    confirmed_at: now,
    meta: { ...meta, approved_at: now }
  })

  // Referral credit: Try to process pending referrals since the payment was just approved.
  // The user might have already created a username, making them fully eligible for referral credit.
  if (username && !isPlaceholder) {
    const pendingRefs = await findPendingReferralsByReferred(referredUid, username)
    for (const ref of pendingRefs) {
      await updateReferral(ref.id, { status: "credited", updated_at: now })
      await updateProfileWallet(ref.referrerUid, Number(ref.amount ?? 50))
    }
  }

  await audit(_req, "payment_approved", { paymentId: id, type: rec.type, amount: rec.amount })

  // Send email with username creation link to the user
  try {
    const email = String(meta?.email ?? "").trim()
    const name = String(meta?.name ?? meta?.username ?? "User").trim()
    if (email && email.includes("@")) {
      const { signUsernameToken } = await import("@/lib/usernameToken")
      const oid = rec.orderId ?? rec.cashfreeOrderId ?? rec.paymentSessionId ?? ""
      const token = signUsernameToken(oid || undefined, rec.id)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ""
      const createLink = token ? `${baseUrl}/create-username?token=${token}` : `${baseUrl}/intro?login=1`
      const { sendEmail } = await import("@/lib/email")
      const { getEmailTemplate } = await import("@/lib/emailTheme")
      const htmlTemplate = getEmailTemplate({
        title: "IQ Earners",
        subtitle: "Payment Approved!",
        content: `Hello <strong>${name}</strong>,<br/><br/>Your payment of <strong>₹${rec.amount}</strong> has been successfully verified and approved. You can now create your account and start competing!`,
        highlightContent: "Payment Verified ✓",
        buttonLink: createLink,
        buttonText: token ? "Create Your Account" : "Log In Now",
        footerText: `Payment ID: ${rec.id} · Amount: ₹${rec.amount}`
      })
      sendEmail({
        to: email,
        subject: "Payment Approved — Create Your IQ Earners Account",
        html: htmlTemplate,
        text: `Your payment of ₹${rec.amount} has been approved. Create your account here: ${createLink}`
      }).catch(() => {})
    }
  } catch {}

  return NextResponse.json({ ok: true })
}

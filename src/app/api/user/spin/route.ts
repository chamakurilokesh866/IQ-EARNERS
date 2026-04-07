import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getProfileByUid, updateProfileWallet } from "@/lib/profiles"
import { getUserSpinForQuiz, addSpin } from "@/lib/spins"
import crypto from "crypto"

export async function POST(req: Request) {
    const cookieStore = await cookies()
    const uid = cookieStore.get("uid")?.value ?? ""
    const profile = uid ? await getProfileByUid(uid) : null

    if (!profile || !profile.username) {
        return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 })
    }

    const { quizId } = await req.json().catch(() => ({}))
    if (!quizId) {
        return NextResponse.json({ ok: false, error: "Quiz ID required" }, { status: 400 })
    }

    // Check if already spun
    const existing = await getUserSpinForQuiz(profile.username, quizId)
    if (existing) {
        return NextResponse.json({ ok: false, error: "Already spun for this quiz" }, { status: 403 })
    }

    // Define rewards and weights
    // 0: Bad Luck
    // 1: ₹1
    // 2: ₹5
    // 3: ₹10
    // 4: Scratch Card ( Rare )
    const rewards = [
        { type: "bad_luck", value: 0, weight: 25, label: "Better luck next time!" },
        { type: "money", value: 1, weight: 40, label: "₹1 Cash" },
        { type: "money", value: 5, weight: 20, label: "₹5 Cash" },
        { type: "money", value: 10, weight: 10, label: "₹10 Bonus" },
        { type: "scratch_card", value: 0, weight: 5, label: "Free Scratch Card!" }
    ]

    const totalWeight = rewards.reduce((s, r) => s + r.weight, 0)
    let random = Math.random() * totalWeight
    let selected = rewards[0]

    for (const r of rewards) {
        if (random < r.weight) {
            selected = r
            break
        }
        random -= r.weight
    }

    // If it's a scratch card, we determine the value now but show it as a scratch card
    // "Values like 20 rupees and decrease scratch card winning possibilities like 30 in 5 users"
    // Let's say scratch card has a 10% chance to win ₹20, else ₹2.
    let finalValue = selected.value
    let scratchValue = 0

    if (selected.type === "scratch_card") {
        // 6% chance of ₹20 (30 in 500 users? No, maybe 30 in 500 is 6%)
        const winLarge = Math.random() < 0.06
        scratchValue = winLarge ? 20 : 2
        finalValue = scratchValue
    }

    // Record the spin
    const spinId = crypto.randomBytes(8).toString("hex")
    const result = await addSpin({
        id: spinId,
        username: profile.username,
        quizId,
        rewardType: selected.type as any,
        rewardValue: finalValue,
        created_at: Date.now()
    })

    if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error || "Failed to record spin" }, { status: 500 })
    }

    // Update wallet if it's money or scratch card (assuming scratch card credits immediately or on scratch?)
    // User said: "make immediate rupees into user referral wallet"
    if (finalValue > 0) {
        await updateProfileWallet(profile.uid, finalValue)
    }

    return NextResponse.json({
        ok: true,
        reward: {
            type: selected.type,
            value: selected.value,
            label: selected.label,
            scratchValue, // Only if type is scratch_card
            index: rewards.indexOf(selected)
        }
    })
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const quizId = searchParams.get("quizId")
    const cookieStore = await cookies()
    const uid = cookieStore.get("uid")?.value ?? ""
    const profile = uid ? await getProfileByUid(uid) : null

    if (!profile || !profile.username || !quizId) {
        return NextResponse.json({ ok: false, canSpin: false })
    }

    const existing = await getUserSpinForQuiz(profile.username, quizId)
    return NextResponse.json({ ok: true, canSpin: !existing })
}

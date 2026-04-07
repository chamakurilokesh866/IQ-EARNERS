import { createServerSupabase } from "./supabase"

export type CreatorApplication = {
    id: string
    email: string
    name: string
    platform: "instagram" | "youtube" | "moj" | "sharechat" | "facebook"
    handle: string
    followers: number
    type: "referral" | "partner"
    cvUrl?: string
    status: "pending" | "approved" | "rejected"
    adminFeedback?: string
    suggestedRole?: string
    otp?: string
    otpExpiresAt?: number
    created_at: number
    updated_at: number
}

export type CreatorProfile = {
    uid: string
    email: string
    handle: string
    platform: string
    role: string
    passwordHash?: string
    isApproved: boolean
    wallet: number
    referrals: number
    creatorType: "referral" | "partner"
    created_at: number
}

export async function getApplications(): Promise<CreatorApplication[]> {
    const supabase = createServerSupabase()
    if (!supabase) return []
    const { data } = await supabase.from("creator_applications").select("*")
    return (data || []).map(d => ({
        ...d,
        cvUrl: d.cv_url,
        adminFeedback: d.admin_feedback,
        suggestedRole: d.suggested_role,
        otpExpiresAt: d.otp_expires_at
    }))
}

export async function saveApplication(app: CreatorApplication): Promise<boolean> {
    const supabase = createServerSupabase()
    if (!supabase) return false
    const { error } = await supabase.from("creator_applications").upsert({
        id: app.id,
        email: app.email,
        name: app.name,
        platform: app.platform,
        handle: app.handle,
        followers: app.followers,
        type: app.type,
        cv_url: app.cvUrl,
        status: app.status,
        admin_feedback: app.adminFeedback,
        suggested_role: app.suggestedRole,
        otp: app.otp,
        otp_expires_at: app.otpExpiresAt,
        created_at: app.created_at,
        updated_at: app.updated_at
    })
    return !error
}

export async function getCreators(): Promise<CreatorProfile[]> {
    const supabase = createServerSupabase()
    if (!supabase) return []
    const { data } = await supabase.from("creator_profiles").select("*")
    return (data || []).map(d => ({
        ...d,
        passwordHash: d.password_hash,
        isApproved: d.is_approved,
        creatorType: d.creator_type
    }))
}

export async function saveCreator(creator: CreatorProfile): Promise<boolean> {
    const supabase = createServerSupabase()
    if (!supabase) return false
    const { error } = await supabase.from("creator_profiles").upsert({
        uid: creator.uid,
        email: creator.email,
        handle: creator.handle,
        platform: creator.platform,
        role: creator.role,
        password_hash: creator.passwordHash,
        is_approved: creator.isApproved,
        wallet: creator.wallet,
        referrals: creator.referrals,
        creator_type: creator.creatorType,
        created_at: creator.created_at
    })
    return !error
}

export async function getApplicationByEmail(email: string): Promise<CreatorApplication | null> {
    const supabase = createServerSupabase()
    if (!supabase) return null
    const { data } = await supabase.from("creator_applications").select("*").eq("email", email.toLowerCase()).single()
    if (!data) return null
    return {
        ...data,
        cvUrl: data.cv_url,
        adminFeedback: data.admin_feedback,
        suggestedRole: data.suggested_role,
        otpExpiresAt: data.otp_expires_at
    }
}

export async function getCreatorByEmail(email: string): Promise<CreatorProfile | null> {
    const supabase = createServerSupabase()
    if (!supabase) return null
    const { data } = await supabase.from("creator_profiles").select("*").eq("email", email.toLowerCase()).single()
    if (!data) return null
    return {
        ...data,
        passwordHash: data.password_hash,
        isApproved: data.is_approved,
        creatorType: data.creator_type
    }
}

export async function getCreatorByHandle(handle: string): Promise<CreatorProfile | null> {
    const supabase = createServerSupabase()
    if (!supabase) return null
    const { data } = await supabase.from("creator_profiles").select("*").eq("handle", handle.toLowerCase()).single()
    if (!data) return null
    return {
        ...data,
        passwordHash: data.password_hash,
        isApproved: data.is_approved,
        creatorType: data.creator_type
    }
}

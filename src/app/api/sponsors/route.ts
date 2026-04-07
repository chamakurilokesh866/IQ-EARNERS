import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import crypto from "crypto"
import { SponsorKind, SponsorRequest, addSponsorRequest, getSponsorRequestByCode } from "@/lib/sponsors"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("id") ?? ""
    if (!code) return NextResponse.json({ ok: false, error: "Missing ID" }, { status: 400 })
    
    const request = await getSponsorRequestByCode(code)
    if (!request) return NextResponse.json({ ok: true, data: { found: false } })
    
    return NextResponse.json({ 
      ok: true, 
      data: { 
        found: true, 
        status: request.status, 
        reply: request.adminReply,
        kind: request.kind,
        brand: request.brand
      } 
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}

function brandPrefix(brand: string): string {
  const clean = String(brand || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
  const base = (clean.slice(0, 3) || "GEN").padEnd(3, "X")
  return base
}

function randomDigits(length: number): string {
  const max = 10 ** length
  const n = crypto.randomInt(0, max)
  return n.toString().padStart(length, "0")
}

function generateCode(existing: SponsorRequest[], brand: string, kind: SponsorKind): string {
  const taken = new Set(existing.map((e) => e.code.toUpperCase()))
  const prefix = brandPrefix(brand)
  const attempts = 50

  for (let i = 0; i < attempts; i++) {
    let code: string
    if (kind === "sponsor") {
      // e.g. ABCIQSPON-123
      code = `${prefix}IQSPON-${randomDigits(3)}`
    } else if (kind === "promotion") {
      // e.g. ABCIQPROM-1234
      code = `${prefix}IQPROM-${randomDigits(4)}`
    } else {
      // collaboration or university – e.g. ABCIQCOLLAB123456 or ABCIQUNIQ123456
      code = kind === "university" ? `${prefix}IQUNIQ${randomDigits(6)}` : `${prefix}IQCOLLAB${randomDigits(6)}`
    }
    const upper = code.toUpperCase()
    if (!taken.has(upper)) return code
  }

  // Fallback: still respect the pattern but append timestamp-based digits
  const ts = Date.now().toString().slice(-6)
  if (kind === "sponsor") return `${prefix}IQSPON-${ts.slice(-3)}`
  if (kind === "promotion") return `${prefix}IQPROM-${ts.slice(-4)}`
  if (kind === "university") return `${prefix}IQUNIQ${ts}`
  return `${prefix}IQCOLLAB${ts}`
}

function str(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(", ").trim()
  return String(v ?? "").trim()
}
function fromFormData(formData: Record<string, unknown>, kind: SponsorKind): { name: string; email: string; brand: string; budget?: string; message: string } {
  const get = (k: string) => str(formData[k])
  const name = get("fullName") || get("name")
  const email = get("workEmail") || get("email")
  const brand = get("companyBrand") || get("brandOrg") || get("brand") || get("orgName")
  const budget = get("amount") || get("budget") || get("estimatedBudget") || ""
  const message = kind === "sponsor"
    ? get("additionalNotes") || "Sponsorship application"
    : kind === "promotion"
    ? get("campaignObjective") || "Promotion inquiry"
    : kind === "university"
    ? get("proposal") || "University partnership"
    : get("aboutOrg") || get("proposalWhat") || "Collaboration proposal"
  return { name, email, brand, budget: budget || undefined, message: message || "—" }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const formData = body?.formData && typeof body.formData === "object" ? body.formData as Record<string, unknown> : null
    const kindRaw = String(body?.kind ?? "sponsor").toLowerCase()
    const kind: SponsorKind =
      kindRaw === "promotion" || kindRaw === "collaboration" || kindRaw === "university" ? (kindRaw as SponsorKind) : "sponsor"

    let name: string
    let email: string
    let brand: string
    let budget: string | undefined
    let message: string

    if (formData) {
      const derived = fromFormData(formData, kind)
      name = derived.name
      email = derived.email
      brand = derived.brand
      budget = derived.budget
      message = derived.message
    } else {
      name = String(body?.name ?? "").trim()
      email = String(body?.email ?? "").trim()
      brand = String(body?.brand ?? "").trim()
      budget = body?.budget != null ? String(body.budget).trim() : undefined
      message = String(body?.message ?? "").trim()
    }

    if (!name || !email || !brand) {
      return NextResponse.json({ ok: false, error: "Name, email and brand/organisation are required" }, { status: 400 })
    }
    if (!message) message = "—"

    const allModule = await import("@/lib/sponsors")
    const existing = await allModule.getSponsorRequests()

    const now = Date.now()
    const code = generateCode(existing, brand, kind)
    const id = String(now)

    const cookieStore = await cookies()
    const uid = cookieStore.get("uid")?.value ?? null

    const entry: SponsorRequest = {
      id,
      code,
      name,
      email,
      brand,
      budget: budget || undefined,
      message,
      kind,
      status: "pending",
      adminReply: undefined,
      uid,
      form_data: formData ?? undefined,
      created_at: now,
      updated_at: now
    }

    const ok = await addSponsorRequest(entry)
    if (!ok) return NextResponse.json({ ok: false, error: "Failed to save request" }, { status: 500 })

    return NextResponse.json({ ok: true, code })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}


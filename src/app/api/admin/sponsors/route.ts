import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { deleteSponsorRequest, getSponsorRequests, updateSponsorRequest } from "@/lib/sponsors"

export async function GET() {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const list = await getSponsorRequests()
  return NextResponse.json({ ok: true, data: list })
}

export async function POST(req: Request) {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const id = String(body?.id ?? "").trim()
  const statusRaw = String(body?.status ?? "").toLowerCase()
  const adminReply = typeof body?.adminReply === "string" ? body.adminReply.trim() : undefined
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 })
  }
  const allowed = ["pending", "accepted", "rejected"]
  if (!allowed.includes(statusRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 })
  }
  const ok = await updateSponsorRequest(id, {
    status: statusRaw as any,
    adminReply,
    updated_at: Date.now()
  })
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Failed to update" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const store = await cookies()
  if (store.get("role")?.value !== "admin") {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const id = String(searchParams.get("id") ?? "").trim()
  if (!id) {
    return NextResponse.json({ ok: false, error: "id query parameter is required" }, { status: 400 })
  }
  const ok = await deleteSponsorRequest(id)
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Not found or delete failed" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}


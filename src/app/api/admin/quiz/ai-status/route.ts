/**
 * Admin-only: check if AI is configured for quiz and mock exam generation.
 */
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { isAiConfigured, isMockExamAiConfigured, isAdminAiConfigured } from "@/lib/aiGateway"

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ ok: false, configured: false, error: auth.error }, { status: auth.status })

  const configured = isAiConfigured()
  const mockExamConfigured = isMockExamAiConfigured()
  const adminAiConfigured = isAdminAiConfigured()
  return NextResponse.json({
    ok: true,
    configured,
    mockExamConfigured,
    adminAiConfigured,
    hint: configured
      ? "NVIDIA_API_KEY is set. Generate with AI should work."
      : "Add NVIDIA_API_KEY to .env.local and restart the dev server. Get a key at build.nvidia.com",
    mockExamHint: mockExamConfigured
      ? "MOCK_EXAM_AI_API_KEY is set. Mock Exam AI generate & PDF extraction work."
      : "Add MOCK_EXAM_AI_API_KEY to .env.local for Mock Exam (separate from Quiz AI).",
    adminAiHint: adminAiConfigured
      ? "ADMIN_AI_API_KEY is set. AI Website Admin Assistant works."
      : "Add ADMIN_AI_API_KEY to .env.local for Admin AI Assistant (separate from Quiz & Mock Exam)."
  }, { headers: { "Cache-Control": "private, no-store" } })
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI client for quiz question generation.
 * Uses OpenAI SDK with NVIDIA NIM API (Nemotron).
 *
 * Quiz AI (NVIDIA_*):
 * - NVIDIA_API_KEY: Required for Quiz Generator, tournaments, etc.
 * - NVIDIA_MODEL: Optional. Default: nvidia/nemotron-3-nano-30b-a3b
 * - NVIDIA_API_BASE: Optional. Default: https://integrate.api.nvidia.com/v1
 *
 * Mock Exam AI (MOCK_EXAM_AI_*) – separate tokens from Quiz AI:
 * - MOCK_EXAM_AI_API_KEY: Required for Mock Exam generate & PDF extraction.
 * - MOCK_EXAM_AI_MODEL: Optional. Default: NVIDIA_MODEL or nemotron
 * - MOCK_EXAM_AI_API_BASE: Optional. Default: NVIDIA_API_BASE or NVIDIA default
 * Admin AI Assistant (ADMIN_AI_*) – separate tokens from Quiz AI and Mock Exam AI:
 * - ADMIN_AI_API_KEY: Required for Admin AI Assistant chat.
 * - ADMIN_AI_MODEL: Optional. Default: NVIDIA_MODEL or nemotron
 * - ADMIN_AI_API_BASE: Optional. Default: NVIDIA_API_BASE or NVIDIA default
 *
 * Where NVIDIA is used (server routes):
 * - Quiz AI: admin quiz generate / auto-generate, parse-with-ai, upload-tournament,
 *   leaderboard (anti-cheat), creator apply, /api/ai/support, /api/ai/explain
 * - Mock Exam AI: mock-exam generate, mock-exam-upload (PDF extraction)
 * - Admin AI: ai-assistant, ai-fix, seo-audit, intro/home/recommendations content
 */
import OpenAI from "openai"

const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1"
const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3-nano-30b-a3b"
const RETRY_ATTEMPTS = 3

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetriableFailure(r: ChatCompletionResult): boolean {
  if (r.ok) return false
  const s = r.status
  return s === 429 || s === 502 || s === 503 || s >= 500
}

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string }

export type ChatCompletionOptions = {
  model?: string
  temperature?: number
  max_tokens?: number
}

export type ChatCompletionResult =
  | { ok: true; content: string; usage?: { prompt_tokens?: number; completion_tokens?: number } }
  | { ok: false; error: string; status: number }

type ChatLabels = { empty: string; quota: string; auth: string; generic: string }

async function chatCompletionOnce(
  client: OpenAI,
  body: Record<string, unknown>,
  labels: ChatLabels
): Promise<ChatCompletionResult> {
  try {
    const completion = await client.chat.completions.create(body as any)
    const choice = completion.choices?.[0]
    const msg = choice?.message
    const content = msg?.content
    if (content == null || typeof content !== "string") {
      return { ok: false, error: labels.empty, status: 502 }
    }
    const usage = completion.usage
    return {
      ok: true,
      content,
      usage: usage ? { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens } : undefined
    }
  } catch (e: any) {
    const err = e as Error & { status?: number }
    const status = typeof err?.status === "number" ? err.status : 502
    if (status === 429) return { ok: false, error: labels.quota, status: 429 }
    if (status === 401 || status === 403) return { ok: false, error: labels.auth, status: 502 }
    return { ok: false, error: err?.message ?? labels.generic, status }
  }
}

async function chatCompletionWithRetries(
  client: OpenAI,
  body: Record<string, unknown>,
  labels: ChatLabels
): Promise<ChatCompletionResult> {
  let last: ChatCompletionResult = { ok: false, error: labels.generic, status: 502 }
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    last = await chatCompletionOnce(client, body, labels)
    if (last.ok) return last
    if (last.error === labels.auth) return last
    if (!isRetriableFailure(last) || i === RETRY_ATTEMPTS - 1) return last
    const base = 400 * 2 ** i
    await sleep(base + Math.floor(Math.random() * 200))
  }
  return last
}

function getClient(): OpenAI | null {
  const apiKey = process.env.NVIDIA_API_KEY?.trim()
  if (!apiKey) return null
  let baseURL = (process.env.NVIDIA_API_BASE?.trim() || NVIDIA_BASE).replace(/\/$/, "")
  baseURL = baseURL.replace(/\/chat\/completions\/?$/i, "")
  baseURL = baseURL.includes("/v1") ? baseURL : `${baseURL}/v1`
  return new OpenAI({ apiKey, baseURL })
}

function getMockExamClient(): OpenAI | null {
  const apiKey = process.env.MOCK_EXAM_AI_API_KEY?.trim()
  if (!apiKey) return null
  const base = process.env.MOCK_EXAM_AI_API_BASE?.trim() || process.env.NVIDIA_API_BASE?.trim() || NVIDIA_BASE
  let baseURL = base.replace(/\/$/, "").replace(/\/chat\/completions\/?$/i, "")
  baseURL = baseURL.includes("/v1") ? baseURL : `${baseURL}/v1`
  return new OpenAI({ apiKey, baseURL })
}

export function isAiConfigured(): boolean {
  return !!process.env.NVIDIA_API_KEY?.trim()
}

export function isMockExamAiConfigured(): boolean {
  return !!process.env.MOCK_EXAM_AI_API_KEY?.trim()
}

function getAdminAIClient(): OpenAI | null {
  const apiKey = process.env.ADMIN_AI_API_KEY?.trim()
  if (!apiKey) return null
  const base = process.env.ADMIN_AI_API_BASE?.trim() || process.env.NVIDIA_API_BASE?.trim() || NVIDIA_BASE
  let baseURL = base.replace(/\/$/, "").replace(/\/chat\/completions\/?$/i, "")
  baseURL = baseURL.includes("/v1") ? baseURL : `${baseURL}/v1`
  return new OpenAI({ apiKey, baseURL })
}

export function isAdminAiConfigured(): boolean {
  return !!process.env.ADMIN_AI_API_KEY?.trim()
}

function buildChatBody(
  clientModel: string,
  messages: ChatMessage[],
  options: ChatCompletionOptions,
  defaultMaxTokens: number
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: options.model ?? clientModel,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? 0.7,
    top_p: 1,
    max_tokens: options.max_tokens ?? defaultMaxTokens,
    stream: false
  }
  const modelName = String(options.model ?? clientModel)
  if (modelName.includes("nemotron")) {
    body.chat_template_kwargs = { enable_thinking: false }
  }
  return body
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const client = getClient()
  if (!client) {
    return {
      ok: false,
      error: "NVIDIA_API_KEY not configured. Add it in .env.local. Get a key at build.nvidia.com",
      status: 503
    }
  }
  const model = process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL
  const body = buildChatBody(model, messages, options, 8192)
  return chatCompletionWithRetries(client, body, {
    empty: "Empty response from AI",
    quota: "API quota exceeded. Try again later.",
    auth: "Invalid API key. Check NVIDIA_API_KEY in .env.local.",
    generic: "AI request failed"
  })
}

export async function chatCompletionForMockExam(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const client = getMockExamClient()
  if (!client) {
    return {
      ok: false,
      error: "MOCK_EXAM_AI_API_KEY not configured. Add it in .env.local for Mock Exam AI (separate from Quiz AI).",
      status: 503
    }
  }
  const model =
    process.env.MOCK_EXAM_AI_MODEL?.trim() || process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL
  const body = buildChatBody(model, messages, options, 8192)
  return chatCompletionWithRetries(client, body, {
    empty: "Empty response from Mock Exam AI",
    quota: "Mock Exam AI quota exceeded. Try again later.",
    auth: "Invalid API key. Check MOCK_EXAM_AI_API_KEY in .env.local.",
    generic: "Mock Exam AI request failed"
  })
}

export async function chatCompletionForAdminAI(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const client = getAdminAIClient()
  if (!client) {
    return {
      ok: false,
      error:
        "ADMIN_AI_API_KEY not configured. Add it in .env.local for Admin AI Assistant (separate from Quiz & Mock Exam).",
      status: 503
    }
  }
  const model = process.env.ADMIN_AI_MODEL?.trim() || process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL
  const body = buildChatBody(model, messages, options, 4096)
  return chatCompletionWithRetries(client, body, {
    empty: "Empty response from Admin AI",
    quota: "Admin AI quota exceeded. Try again later.",
    auth: "Invalid API key. Check ADMIN_AI_API_KEY in .env.local.",
    generic: "Admin AI request failed"
  })
}

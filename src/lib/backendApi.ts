const renderBackendEnabled = Boolean(process.env.NEXT_PUBLIC_RENDER_BACKEND_URL)

/**
 * Route selected API paths through Vercel rewrite (/render-api/*) when
 * Render backend is enabled. Falls back to local /api routes otherwise.
 */
export function backendAwareApi(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (!normalized.startsWith("/api/")) return normalized
  if (!renderBackendEnabled) return normalized

  const useRender =
    normalized.startsWith("/api/mock-exam/") ||
    normalized.startsWith("/api/admin/mock-exam") ||
    normalized.startsWith("/api/admin/quiz/ai-status")

  if (!useRender) return normalized
  return `/render-api/${normalized.slice("/api/".length)}`
}


/**
 * Client-side fetch wrapper that adds CSRF token from cookie to requests.
 * Use for POST, PUT, PATCH, DELETE to protect against CSRF.
 */

function getCsrfFromCookie(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function fetchWithCsrf(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase()
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method)
  const headers = new Headers(init?.headers)
  if (needsCsrf) {
    const token = getCsrfFromCookie()
    if (token) headers.set("X-CSRF-Token", token)
  }
  return fetch(url, { ...init, headers })
}

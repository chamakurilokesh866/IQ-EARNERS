/**
 * Routes that use a minimal shell: no app sidebar, no mobile bottom nav,
 * no main app chrome — for API/integration docs (same idea as `/intro` vs `/home`).
 */
export function isMoreHubOrApiGuidePath(pathname: string): boolean {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`
  if (p === "/integration-guide" || p.startsWith("/integration-guide/")) return true
  if (p === "/more" || p === "/more/api-guide" || p.startsWith("/more/api-guide/")) return true
  return false
}

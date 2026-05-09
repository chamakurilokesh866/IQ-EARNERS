/**
 * Organization portal login paths (per-org secret segment in URL).
 */
export function orgPortalLoginPath(slug: string, portalCode: string): string {
  const s = String(slug).trim()
  const p = String(portalCode).trim().toLowerCase()
  return `/org/${encodeURIComponent(s)}/portal/${encodeURIComponent(p)}/login`
}

export function absoluteOrgPortalLoginUrl(baseUrl: string, slug: string, portalCode: string): string {
  const origin = baseUrl.replace(/\/$/, "")
  return `${origin}${orgPortalLoginPath(slug, portalCode)}`
}

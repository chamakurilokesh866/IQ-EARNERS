"use client"

import { orgPortalLoginPath } from "@/lib/orgPortalPaths"

export function orgPortalStorageKey(slug: string): string {
  return `orgPortal:${String(slug).trim()}`
}

/** Remember portal code for this tab so sign-out can return to the secure login URL. Cleared when the browser/tab session ends. */
export function rememberOrgPortalCode(slug: string, portalCode: string): void {
  try {
    sessionStorage.setItem(orgPortalStorageKey(slug), String(portalCode).trim().toLowerCase())
  } catch {
    /* ignore quota / private mode */
  }
}

export function getStoredOrgPortalCode(slug: string): string | null {
  try {
    return sessionStorage.getItem(orgPortalStorageKey(slug))
  } catch {
    return null
  }
}

/** Prefer API-provided portal when logged in; else tab session storage; else legacy gate page. */
export function orgLoginRedirectPath(slug: string, portalFromApi?: string | null): string {
  const fromApi = portalFromApi?.trim().toLowerCase()
  const stored = getStoredOrgPortalCode(slug)
  const code = fromApi || stored
  if (code) return orgPortalLoginPath(slug, code)
  return `/org/${encodeURIComponent(String(slug).trim())}/login`
}

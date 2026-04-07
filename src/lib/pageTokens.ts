import type { PageToken } from '@/types';

// ──────────────────────────────────────────────────────────────────────────
// Client-side only helper – used by TokenLink and navigation components.
// Server-side token verification is handled directly in middleware.
// ──────────────────────────────────────────────────────────────────────────

let _cache: PageToken[] = [];
let _cacheTime = 0;
const CACHE_TTL = 30_000; // 30 seconds

/** Fetch token list from the admin API. Client-side only. */
export async function fetchPageTokens(): Promise<PageToken[]> {
  // Bail out if running server-side (no relative fetch available).
  if (typeof window === 'undefined') return [];

  if (_cache.length > 0 && Date.now() - _cacheTime < CACHE_TTL) {
    return _cache;
  }

  try {
    const res = await fetch('/api/admin/page-tokens', { cache: 'no-store' });
    if (!res.ok) return _cache;
    const data = await res.json();
    _cache = data?.tokens ?? [];
    _cacheTime = Date.now();
    return _cache;
  } catch {
    return _cache; // return stale cache on error
  }
}

/** Return the token string for a given page path (e.g. "/leaderboard"). */
export async function getPageToken(pagePath: string): Promise<string | null> {
  const tokens = await fetchPageTokens();
  // Strip query string for lookup
  const cleanPath = pagePath.split('?')[0];
  const entry = tokens.find((t) => t.page === cleanPath);
  return entry?.token ?? null;
}

/** Verify that a token belongs to a page (client-side). */
export async function verifyPageToken(pagePath: string, token?: string): Promise<boolean> {
  if (!token) return false;
  const tokens = await fetchPageTokens();
  const cleanPath = pagePath.split('?')[0];
  return tokens.some((t) => t.page === cleanPath && t.token === token);
}

/**
 * Build a tokenized URL for client-side navigation.
 * e.g. /leaderboard → /leaderboard/ab12c
 * Falls back to the plain path if no token is configured.
 */
export async function buildTokenUrl(pagePath: string): Promise<string> {
  const cleanPath = pagePath.split('?')[0];
  const query = pagePath.includes('?') ? '?' + pagePath.split('?')[1] : '';
  const token = await getPageToken(cleanPath);
  return token ? `${cleanPath}/${token}${query}` : pagePath;
}

/** Invalidate the in-memory cache (call after admin saves new tokens). */
export function invalidateTokenCache(): void {
  _cache = [];
  _cacheTime = 0;
}

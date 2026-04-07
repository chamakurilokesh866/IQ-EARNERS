/**
 * Bootstrap URL with cache-busting per page load to prevent stale user data after login/logout.
 * Shared timestamp allows request deduplication within same load.
 */
let _bust: number | null = null
export function getBootstrapUrl(): string {
  if (_bust == null) _bust = Date.now()
  return `/api/bootstrap?_=${_bust}`
}

/** Reset bust (e.g. after login redirect for fresh fetch) */
export function resetBootstrapBust(): void {
  _bust = null
}

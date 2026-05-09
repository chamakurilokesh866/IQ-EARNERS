/**
 * Short-lived in-memory cache for MX lookups during email availability checks.
 * Avoids repeated DNS queries for the same domain while the user edits the field.
 */
const TTL_MS = 15 * 60 * 1000
const MAX_ENTRIES = 400

const store = new Map<string, { expires: number; ok: boolean }>()

export function getMxCache(domain: string): boolean | undefined {
  const row = store.get(domain)
  if (!row) return undefined
  if (Date.now() > row.expires) {
    store.delete(domain)
    return undefined
  }
  return row.ok
}

export function setMxCache(domain: string, ok: boolean): void {
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value as string | undefined
    if (first) store.delete(first)
  }
  store.set(domain, { expires: Date.now() + TTL_MS, ok })
}

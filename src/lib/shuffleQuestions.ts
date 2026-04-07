/** Fisher-Yates shuffle. Deterministic when seed provided. */
export function shuffleArray<T>(arr: T[], seed?: number): T[] {
  const out = [...arr]
  let s = seed ?? Math.random() * 0xffffffff
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    const tmp = out[i]
    out[i] = out[j]!
    out[j] = tmp!
  }
  return out
}

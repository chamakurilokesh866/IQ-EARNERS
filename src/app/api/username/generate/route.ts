import { NextResponse } from "next/server"

/**
 * AI-style username generator. Produces creative usernames that satisfy:
 * 1 special char (. _ - @), 1 number, 1 capital letter, 6+ characters
 */
const PREFIXES = [
  "Quiz", "Star", "Pro", "Ace", "Brain", "Smart", "Genius", "Swift", "Bold", "Nova",
  "Pixel", "Zen", "Flow", "Echo", "Luna", "Solar", "Cosmo", "Vibe", "Elite", "Prime",
  "Alpha", "Omega", "Nexus", "Pulse", "Spark", "Beam", "Wave", "Cipher", "Vault", "Crown"
]
const SUFFIXES = [
  "Master", "King", "Queen", "Lord", "Ninja", "Hero", "Legend", "Sage", "Mind", "Soul",
  "Rider", "Hunter", "Walker", "Seeker", "Maker", "Runner", "Shaker", "Breaker"
]
const SPECIALS = [".", "_", "-", "@"]
const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomStr(len: number, from = CHARS): string {
  let s = ""
  for (let i = 0; i < len; i++) s += from[Math.floor(Math.random() * from.length)]
  return s
}

export async function GET() {
  // Slight delay to simulate AI "thinking"
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400))

  const templates = [
    () => `${pick(PREFIXES)}${pick(SPECIALS)}${randomStr(1).toUpperCase()}${randomStr(2)}${Math.floor(Math.random() * 9) + 1}`,
    () => `${pick(PREFIXES)}${randomStr(1).toUpperCase()}${pick(SPECIALS)}${randomStr(2)}${Math.floor(Math.random() * 99) + 1}`,
    () => `${pick(SUFFIXES).slice(0, 4)}${pick(SPECIALS)}${pick(PREFIXES).slice(0, 2).toUpperCase()}${Math.floor(Math.random() * 99) + 10}`,
    () => `${randomStr(1).toUpperCase()}${randomStr(2)}${pick(SPECIALS)}${pick(PREFIXES)}${Math.floor(Math.random() * 9) + 1}`,
    () => `${pick(PREFIXES)}${pick(SPECIALS)}${pick(SUFFIXES).slice(0, 3)}${Math.floor(Math.random() * 9) + 1}`,
    () => `${pick(["X", "Z", "Q"])}${randomStr(2)}${pick(SPECIALS)}${pick(PREFIXES)}${Math.floor(Math.random() * 99)}`
  ]

  const template = pick(templates)
  let username = template()
  while (username.length < 6) username = template()
  username = username.slice(0, 20)

  return NextResponse.json({ ok: true, username })
}

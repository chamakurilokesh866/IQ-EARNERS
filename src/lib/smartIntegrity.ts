/**
 * Smart Integrity Engine — Rule-based suspicious pattern detection.
 * Flags unusually fast scores, time consistency anomalies.
 */

export type TimeRow = { timeSeconds?: number; correct?: boolean }

/** Analyze per-question times for suspicious patterns. */
export function analyzeTimeConsistency(
  rows: TimeRow[],
  timePerQuestionSec: number = 30
): { suspicious: boolean; reason?: string; details?: Record<string, unknown> } {
  if (!Array.isArray(rows) || rows.length === 0) return { suspicious: false }

  const times = rows.map((r) => Number(r?.timeSeconds ?? 0)).filter((t) => t >= 0)
  if (times.length === 0) return { suspicious: false }

  const minReasonable = 2 // minimum seconds per question (reading + click)
  const allTooFast = times.every((t) => t < minReasonable)
  if (allTooFast) {
    return {
      suspicious: true,
      reason: "all_questions_too_fast",
      details: { times, minReasonable, count: times.length }
    }
  }

  const tooFastCount = times.filter((t) => t < minReasonable).length
  const pctTooFast = tooFastCount / times.length
  if (pctTooFast > 0.7) {
    return {
      suspicious: true,
      reason: "most_questions_answered_in_under_2_seconds",
      details: { tooFastCount, total: times.length, pctTooFast }
    }
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const variance = times.reduce((s, t) => s + (t - avg) ** 2, 0) / times.length
  const stdDev = Math.sqrt(variance)
  if (stdDev < 0.5 && times.length >= 5 && avg < 5) {
    return {
      suspicious: true,
      reason: "suspiciously_uniform_fast_times",
      details: { avg, stdDev, times: times.slice(0, 10) }
    }
  }

  return { suspicious: false }
}

/** Flag unusually fast high scores. Score submission validation. */
export function flagUnusuallyFastScore(
  score: number,
  total: number,
  totalTimeSeconds: number,
  timePerQuestionSec: number = 30
): { flagged: false } | { flagged: true; level: "low" | "medium" | "high" | "critical"; reason?: string } {
  if (total <= 0 || totalTimeSeconds < 0) return { flagged: false }
  const pctCorrect = score / total
  const secPerQuestion = totalTimeSeconds / total
  const minReasonable = 2

  if (secPerQuestion < minReasonable && pctCorrect >= 0.8) {
    return {
      flagged: true,
      level: pctCorrect >= 0.95 && secPerQuestion < 1 ? "critical" : "high",
      reason: `High score (${score}/${total}) with avg ${secPerQuestion.toFixed(1)}s per question`
    }
  }

  if (secPerQuestion < 3 && pctCorrect >= 0.95) {
    return {
      flagged: true,
      level: "medium",
      reason: `Near-perfect score (${score}/${total}) in ${totalTimeSeconds}s (${secPerQuestion.toFixed(1)}s/q)`
    }
  }

  if (totalTimeSeconds < total * 2 && pctCorrect >= 0.9) {
    return {
      flagged: true,
      level: "low",
      reason: `Fast high score: ${score}/${total} in ${totalTimeSeconds}s`
    }
  }

  return { flagged: false }
}

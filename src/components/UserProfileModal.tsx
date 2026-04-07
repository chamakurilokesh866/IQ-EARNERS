"use client"

import { useEffect, useState } from "react"
import FlagImg from "./FlagImg"
import { useModalA11y } from "@/hooks/useModalA11y"

type ProfileData = {
  username: string
  country?: string
  streak: number
  history: Array<{ date: string; score: number; total: number; totalTimeSeconds?: number }>
  achievements: string[]
  tournamentResults?: Array<{ tournamentId: string; tournamentTitle: string; score: number; totalTimeSeconds?: number; rank: number }>
  currentScore?: number
  totalTimeSeconds?: number
  rank?: number
}

const BADGE_LABELS: Record<string, string> = {
  first_quiz: "First Quiz",
  perfect_5: "Perfect 5",
  streak_3: "3-Day Streak",
  streak_7: "7-Day Streak",
  top_3: "Top 3",
  ten_correct: "10 Correct"
}

function formatDate(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-")
    const month = new Date(2000, parseInt(m || "1", 10) - 1, 1).toLocaleString("default", { month: "short" })
    return `${d} ${month} ${y}`
  } catch {
    return isoDate
  }
}

export default function UserProfileModal({ username, onClose, tournamentId }: { username: string; onClose: () => void; tournamentId?: string }) {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const contentRef = useModalA11y(true, onClose)
  useEffect(() => {
    if (!username) return
    setLoading(true)
    const url = `/api/public/profile/${encodeURIComponent(username)}${tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ""}`
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setData(j?.data ?? null)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [username, tournamentId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div
        ref={contentRef}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-black/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <FlagImg code={data?.country} size={40} />
            <div>
              <div id="profile-modal-title" className="font-bold text-lg">@{username}</div>
              <div className="text-xs text-white/60">Profile & Activity</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10 transition-colors" aria-label="Close">✕</button>
        </div>
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/10 p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{data.rank ?? "—"}</div>
                  <div className="text-xs text-white/60">Rank</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 text-center">
                  <div className="text-2xl font-bold text-accent">{data.currentScore ?? 0}</div>
                  <div className="text-xs text-white/60">Score</div>
                </div>
                <div className="rounded-xl bg-white/10 p-3 text-center">
                  <div className="text-2xl font-bold">🔥{data.streak}</div>
                  <div className="text-xs text-white/60">Streak</div>
                </div>
              </div>
              {data.achievements?.length > 0 && (
                <div>
                  <div className="font-semibold mb-2">Achievements</div>
                  <div className="flex flex-wrap gap-2">
                    {data.achievements.map((id) => (
                      <span key={id} className="pill bg-primary/20 text-primary text-xs">
                        {BADGE_LABELS[id] ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.tournamentResults && data.tournamentResults.length > 0 && (
                <div>
                  <div className="font-semibold mb-2">Tournament Results</div>
                  <div className="space-y-2">
                    {data.tournamentResults.map((t, i) => (
                      <div key={t.tournamentId || i} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5 text-sm">
                        <span className="text-white/90 truncate pr-2">{t.tournamentTitle}</span>
                        <span className="font-medium shrink-0">#{t.rank} · {t.score} pts</span>
                        {t.totalTimeSeconds != null && <span className="text-white/60 text-xs shrink-0 ml-1">{t.totalTimeSeconds}s</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="font-semibold mb-2">Quiz History</div>
                {data.history?.length ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {data.history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-sm">
                        <span className="text-white/70 shrink-0">{formatDate(h.date)}</span>
                        <span className="font-medium">{h.score}/{h.total}</span>
                        {h.totalTimeSeconds != null && <span className="text-white/60 text-xs">{h.totalTimeSeconds}s</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/60">No quiz history yet</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-white/60">Could not load profile</div>
          )}
        </div>
      </div>
    </div>
  )
}

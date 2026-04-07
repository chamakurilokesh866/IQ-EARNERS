"use client"

import type { Player } from "../data/players"

export default function PlayerModal({
  player,
  onClose
}: {
  player: Player | null
  onClose: () => void
}) {
  if (!player) return null
  return (
    <div className="fixed inset-0 z-50 animate-fade">
      <div className="absolute inset-0 bg-black/40 transition-base" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative w-full max-w-lg rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl animate-pop">
          <button
            className="absolute right-4 top-4 rounded bg-navy-700 px-3 py-1 text-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-navy-600" />
              <div>
                <div className="text-xl font-semibold">{player.name}</div>
                <div className="text-sm text-navy-300">{player.title}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-navy-300">{player.bio}</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-white/5 p-3 backdrop-blur">
                <div className="text-xs text-navy-300">Score</div>
                <div className="text-primary font-bold">{player.score.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-white/5 p-3 backdrop-blur">
                <div className="text-xs text-navy-300">Quizzes</div>
                <div className="font-semibold">{player.quizzes}</div>
              </div>
              <div className="rounded-lg bg-white/5 p-3 backdrop-blur">
                <div className="text-xs text-navy-300">Win Rate</div>
                <div className="font-semibold">{player.winRate}%</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {player.achievements.map((a, i) => (
                <span key={i} className="pill bg-white/10">{a}</span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {player.links.map((l) => (
                <a key={l.label} href={l.href} className="underline underline-offset-4 hover:text-primary">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

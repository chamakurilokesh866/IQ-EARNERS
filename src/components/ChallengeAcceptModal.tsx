"use client"

export default function ChallengeAcceptModal({
  challengerName,
  challenge,
  onAccept,
  onDecline,
  loading
}: {
  challengerName: string
  challenge: string
  onAccept: () => void
  onDecline: () => void
  loading?: boolean
}) {
  const [correct, total] = challenge.split("_").map(Number)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-2xl bg-navy-900 border border-navy-700 p-6 shadow-2xl animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-3xl mb-3">🏆</div>
          <h2 className="text-xl font-bold text-primary">Your friend {challengerName} challenged you!</h2>
          <p className="mt-2 text-sm text-navy-300">Beat {correct}/{total} to win. Accept the challenge?</p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAccept?.() }}
            disabled={loading}
            className="w-full pill bg-primary text-black font-semibold py-3"
          >
            {loading ? "…" : "Accept Challenge"}
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDecline?.() }}
            disabled={loading}
            className="w-full pill bg-navy-700 text-navy-300 py-3 hover:bg-red-500/20 hover:text-red-400"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoadingTournaments() {
  return (
    <div className="min-h-screen bg-[#0b1220] p-4 md:p-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="h-10 w-48 rounded-xl bg-white/10" />
        <div className="h-5 w-72 rounded-lg bg-white/5" />
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
              <div className="h-5 w-3/4 rounded-lg bg-white/10" />
              <div className="h-4 w-1/2 rounded-lg bg-white/5" />
              <div className="h-10 w-full rounded-xl bg-white/10 mt-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

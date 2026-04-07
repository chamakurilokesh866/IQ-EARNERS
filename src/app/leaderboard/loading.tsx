export default function LoadingLeaderboard() {
  return (
    <div className="min-h-screen bg-[#0b1220] p-4 md:p-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="h-10 w-48 rounded-xl bg-white/10" />
        {/* Podium */}
        <div className="flex items-end justify-center gap-4 h-40">
          <div className="w-24 h-28 rounded-t-2xl bg-white/10" />
          <div className="w-24 h-36 rounded-t-2xl bg-primary/20" />
          <div className="w-24 h-20 rounded-t-2xl bg-white/10" />
        </div>
        {/* Table rows */}
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-white/10" />
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="flex-1 h-4 rounded-lg bg-white/10" />
              <div className="w-16 h-4 rounded-lg bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LoadingUser() {
  return (
    <div className="min-h-screen bg-[#0b1220] p-4 md:p-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/10" />
          <div className="space-y-2">
            <div className="h-6 w-40 rounded-xl bg-white/10" />
            <div className="h-4 w-24 rounded-lg bg-white/5" />
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="h-8 w-12 rounded-lg bg-white/10" />
              <div className="h-3 w-full rounded-lg bg-white/5" />
            </div>
          ))}
        </div>
        {/* Content area */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 rounded-lg bg-white/10" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

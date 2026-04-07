export default function LoadingPrizes() {
  return (
    <div className="min-h-screen bg-[#0b1220] p-4 md:p-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-40 rounded-xl bg-white/10" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <div className="w-full aspect-square rounded-xl bg-white/10" />
              <div className="h-4 w-3/4 rounded-lg bg-white/10" />
              <div className="h-3 w-1/2 rounded-lg bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

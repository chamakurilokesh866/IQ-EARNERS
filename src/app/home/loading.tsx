export default function Loading() {
  return (
    <div className="animate-pulse space-y-6 p-4">
      <div className="h-8 w-48 rounded-lg bg-white/5" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-white/5" />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-white/5" />
      <div className="h-32 rounded-xl bg-white/5" />
    </div>
  )
}

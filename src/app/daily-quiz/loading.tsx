export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <div className="text-sm text-white/50">Loading quiz…</div>
      </div>
    </div>
  )
}

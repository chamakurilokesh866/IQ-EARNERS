/** Loading state for intro route — shown briefly while useSearchParams resolves. */
export default function IntroLoading() {
  return (
    <main className="intro-page-scroll min-h-screen flex flex-col items-center px-4 sm:px-6 py-8 sm:py-10 relative">
      <div className="absolute inset-0 bg-black -z-20" />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-[40vh]">
        <div className="w-20 h-20 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm text-white/50">Loading…</p>
      </div>
    </main>
  )
}

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 animate-fade-in text-white">
      <div className="relative mb-8">
        {/* Animated Glow Rings */}
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
      
      <div className="space-y-4 text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary animate-pulse">
          Terminal Initialising
        </div>
        <div className="w-48 h-[1px] bg-white/5 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent w-full animate-[moneyFlow_1.5s_infinite_linear]" />
        </div>
      </div>
    </div>
  )
}

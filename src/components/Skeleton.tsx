"use client"

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/10 rounded ${className}`} />
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade">
      <div className="flex justify-center gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-24 sm:w-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-10 w-full max-w-xs rounded-xl" />
        </div>
        <div className="divide-y divide-white/10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center gap-4 py-4 px-4 sm:px-6">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-12 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function UserDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade">
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-14 w-40 rounded-full" />
        <Skeleton className="h-14 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl p-5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}

export function PrizeSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card overflow-hidden transition-all bg-white/5 border border-white/10 rounded-2xl">
          <Skeleton className="h-40 w-full rounded-none" />
          <div className="p-5 space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-10 w-full rounded-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  )
}


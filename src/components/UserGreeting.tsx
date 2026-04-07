"use client"

export default function UserGreeting({ username }: { username: string | null }) {
  if (!username?.trim()) return null
  return (
    <p className="text-xs md:text-sm text-navy-300 truncate max-w-full" title={`Hi my dear user @${username}, how are you?`}>
      Hi my dear user <span className="text-primary font-medium">@{username}</span>, how are you?
    </p>
  )
}

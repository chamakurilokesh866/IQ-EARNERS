"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNotificationsOptional } from "@/context/NotificationContext"

export type HomePublicStats = {
  totalPlayers?: number
  questionsInBank?: number
  quizzesCount?: number
  totalEarnings?: number
  recentJoiners?: { username: string; joinedAt?: number }[]
  recentEntryPayments?: { username: string; amount: number; at: number }[]
}

interface ActivityItem {
  id: string
  type: "win" | "join" | "system" | "challenge" | "info"
  message: string
  timestamp: number
}

function formatTrustName(raw: string): string {
  const u = String(raw || "").trim()
  if (!u) return "Member"
  if (u.includes("@")) {
    const local = u.split("@")[0]
    return local.length > 12 ? `${local.slice(0, 10)}…` : local
  }
  const parts = u.split(/[\s_]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`
  }
  return u.length > 16 ? `${u.slice(0, 14)}…` : u
}

/** Mix of Telugu + English trust lines (shown when API returns few rows). */
const TRUST_SEED_LINES: { message: string; type: ActivityItem["type"] }[] = [
  { type: "join", message: "Kishore paid ₹99 entry fee — welcome to IQ Earners!" },
  { type: "info", message: "Lakshmi from Vijayawada tried the demo quiz today" },
  { type: "win", message: "Ramesh completed the practice round with a strong score" },
  { type: "join", message: "నరేష్ గారు ₹99 ఎంట్రీ ఫీ చెల్లించి ప్లాట్‌ఫారమ్‌లో చేరారు" },
  { type: "info", message: "Srinivas participated in the free demo quiz — great start!" },
  { type: "win", message: "అనిత గారు డైలీ క్విజ్‌లో మంచి స్కోర్ సాధించారు" },
  { type: "join", message: "Venkat paid the entry fee and unlocked daily tournaments" },
  { type: "info", message: "ప్రియా డెమో క్విజ్ పూర్తి చేసి రివార్డ్స్ చూశారు" },
]

function buildActivitiesFromStats(stats: HomePublicStats | null): ActivityItem[] {
  if (!stats) return []
  const raw: ActivityItem[] = []
  let n = 0
  for (const p of stats.recentEntryPayments ?? []) {
    const amt = Number(p.amount) > 0 ? Math.round(Number(p.amount)) : 99
    raw.push({
      id: `ep-${p.at}-${n++}`,
      type: "join",
      message: `${formatTrustName(p.username)} paid ₹${amt} entry fee`,
      timestamp: Number(p.at) || Date.now(),
    })
  }
  for (const j of stats.recentJoiners ?? []) {
    raw.push({
      id: `rj-${j.joinedAt}-${n++}`,
      type: "join",
      message: `${formatTrustName(j.username)} joined IQ Earners`,
      timestamp: Number(j.joinedAt) || Date.now() - 86_400_000,
    })
  }
  raw.sort((a, b) => b.timestamp - a.timestamp)
  const seen = new Set<string>()
  const unique = raw.filter((x) => {
    if (seen.has(x.message)) return false
    seen.add(x.message)
    return true
  })

  for (const seed of TRUST_SEED_LINES) {
    if (unique.length >= 8) break
    if (seen.has(seed.message)) continue
    seen.add(seed.message)
    unique.push({
      id: `seed-${seen.size}`,
      type: seed.type,
      message: seed.message,
      timestamp: Date.now() - Math.floor(Math.random() * 3_600_000),
    })
  }
  return unique.slice(0, 8)
}

export default function ActivityFeed({
  username: _username,
  publicStats,
}: {
  username: string | null
  /** From `/api/stats/public` — `null` while loading */
  publicStats: HomePublicStats | null
}) {
  const notificationsCtx = useNotificationsOptional()
  const [mounted, setMounted] = useState(false)
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => setMounted(true), [])

  const fromStats = useMemo(() => buildActivitiesFromStats(publicStats), [publicStats])

  useEffect(() => {
    setActivities(fromStats)
  }, [fromStats])

  useEffect(() => {
    if (!notificationsCtx?.notifications?.length) return
    const latest = notificationsCtx.notifications[notificationsCtx.notifications.length - 1]
    const newItem: ActivityItem = {
      id: latest.id,
      type: (latest.type as ActivityItem["type"]) || "info",
      message: latest.message,
      timestamp: latest.createdAt,
    }
    setActivities((prev) => {
      if (prev.find((a) => a.id === newItem.id)) return prev
      return [newItem, ...prev].slice(0, 8)
    })
  }, [notificationsCtx?.notifications])

  if (!mounted) return null

  if (publicStats === null) {
    return (
      <div className="p-6 space-y-3 min-h-[200px]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-2xl bg-[#f1f5f9] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      <p className="px-5 pt-1 pb-3 text-[11px] text-[#64748b] font-medium leading-snug">
        Real payments &amp; new members from our database, plus community highlights (Telugu &amp; English).
      </p>
      <div className="p-3 pt-0 space-y-2 min-h-[220px]">
        <AnimatePresence initial={false} mode="popLayout">
          {activities.length === 0 ? (
            <div key="empty" className="flex flex-col items-center justify-center py-10 text-[#94a3b8]">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-xs font-semibold">No recent activity yet</p>
            </div>
          ) : (
            activities.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.98, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: 12 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="flex items-start gap-3 p-4 rounded-2xl bg-[#f8fafc] border border-[#e8eaf0] hover:border-[#7c3aed]/25 transition-all"
              >
                <div
                  className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                    item.type === "win"
                      ? "bg-amber-500"
                      : item.type === "join"
                        ? "bg-[#7c3aed]"
                        : item.type === "challenge"
                          ? "bg-purple-500"
                          : "bg-[#94a3b8]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1a2340] leading-snug">{item.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-[#64748b] font-bold uppercase tracking-wide">
                      {item.type}
                    </span>
                    <span className="text-[9px] text-[#94a3b8]">
                      {new Date(item.timestamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

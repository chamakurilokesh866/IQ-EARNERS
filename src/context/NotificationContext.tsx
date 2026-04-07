"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

export type NotificationItem = {
  id: string
  message: string
  type?: "info" | "success" | "referral" | "certificate" | "challenge" | "win" | "system" | "spin"
  read: boolean
  createdAt: number
  /** When set, bell row navigates here on tap (e.g. /user?highlight=spin) */
  actionHref?: string
}

/** Important notification types shown in the compact bell dropdown */
export const IMPORTANT_NOTIFICATION_TYPES: NotificationItem["type"][] = [
  "certificate",
  "referral",
  "challenge",
  "success",
  "win",
  "system",
  "spin"
]

type NotificationState = {
  notifications: NotificationItem[]
  unreadCount: number
  addNotification: (message: string, type?: NotificationItem["type"], actionHref?: string) => void
  markOneRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

const Ctx = createContext<NotificationState | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const addNotification = useCallback(
    (message: string, type: NotificationItem["type"] = "info", actionHref?: string) => {
      const id = `n-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const item: NotificationItem = { id, message, type, read: false, createdAt: Date.now(), actionHref }
      setNotifications((prev) => [...prev, item])
    },
    []
  )

  const markOneRead = useCallback((id: string) => {
    setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const value = useMemo(
    () => ({ notifications, unreadCount, addNotification, markOneRead, markAllRead, clearAll }),
    [notifications, unreadCount, addNotification, markOneRead, markAllRead, clearAll]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications() {
  const v = useContext(Ctx)
  if (!v) throw new Error("NotificationProvider not found")
  return v
}

export function useNotificationsOptional() {
  return useContext(Ctx)
}

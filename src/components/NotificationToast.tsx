"use client"

import { useEffect, useRef } from "react"
import { useNotificationsOptional } from "@/context/NotificationContext"

export default function NotificationToast({ username }: { username: string | null }) {
  const addNotification = useNotificationsOptional()?.addNotification
  const lastNotified = useRef<string>("")
  useEffect(() => {
    const subscribedKey = "push_subscribed"
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        if (!window.localStorage.getItem(subscribedKey)) {
          const pub = await fetch("/api/push/vapid-public").then((r) => r.json()).catch(() => null)
          if (pub?.ok && pub?.key) {
            const urlBase64ToUint8Array = (base64: string) => {
              const padding = "=".repeat((4 - (base64.length % 4)) % 4)
              const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
              const rawData = window.atob(base64Safe)
              const outputArray = new Uint8Array(rawData.length)
              for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
              return outputArray
            }
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(pub.key)
            }).catch(() => null)
            if (sub) {
              await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub }) }).catch(() => {})
              try { window.localStorage.setItem(subscribedKey, "1") } catch {}
            }
          }
        }
      }).catch(() => {})
    }
    const checkAndShow = async () => {
      const [quizRes, tournRes] = await Promise.all([
        fetch("/api/quizzes", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/tournaments", { cache: "no-store" }).then((r) => r.json())
      ])
      const items = Array.isArray(quizRes?.data) ? quizRes.data : []
      const tournaments = Array.isArray(tournRes?.data) ? tournRes.data : []
      const upcoming = tournaments.filter((t: any) => t?.endTime && new Date(t.endTime).getTime() > Date.now())
      const q = items.length
      const t = upcoming.length
      if (!(q || t) || !addNotification) return
      const todayKey = new Date().toDateString()
      if (lastNotified.current === todayKey) return
      const msg = q && t
        ? "Quiz & tournament available. Tap the bell to see more."
        : t
          ? "Tournament open. Join now!"
          : username ? `${username}, your quiz is ready.` : "Your quiz is ready."
      lastNotified.current = todayKey
      addNotification(msg, "info")
    }
    checkAndShow()
    const interval = setInterval(checkAndShow, 60 * 1000)
    return () => clearInterval(interval)
  }, [username, addNotification])
  return null
}

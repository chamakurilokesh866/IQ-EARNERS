/**
 * IQ Earners – Capacitor Native Bridge
 * Handles: Push Notifications, Haptics, Status Bar, Deep Links, Back Button
 * Only runs inside the native Android/iOS app (not in browser).
 */
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

declare global {
    interface Window {
        Capacitor?: {
            isNativePlatform: () => boolean
            getPlatform: () => "android" | "ios" | "web"
        }
    }
}

function isNative(): boolean {
    return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.()
}

export default function CapacitorBridge() {
    const router = useRouter()

    useEffect(() => {
        if (!isNative()) return

        let cleanup: (() => void)[] = []

        const initCapacitor = async () => {
            try {
                // ── Push Notifications ──────────────────────────────────────
                const { PushNotifications } = await import("@capacitor/push-notifications")
                const { LocalNotifications } = await import("@capacitor/local-notifications")
                const { StatusBar, Style } = await import("@capacitor/status-bar")
                const { SplashScreen } = await import("@capacitor/splash-screen")
                const { App } = await import("@capacitor/app")
                const { Haptics, ImpactStyle } = await import("@capacitor/haptics")

                // Status bar styling
                await StatusBar.setStyle({ style: Style.Dark })
                await StatusBar.setBackgroundColor({ color: "#000000" })

                // Hide splash screen after app loads
                await SplashScreen.hide({ fadeOutDuration: 500 })

                // Request push notification permissions
                const permStatus = await PushNotifications.checkPermissions()
                if (permStatus.receive !== "granted") {
                    await PushNotifications.requestPermissions()
                }

                // Register for push notifications
                await PushNotifications.register()

                // Handle FCM/APNS token
                const tokenListener = await PushNotifications.addListener("registration", (token) => {
                    // Send device token to server so admin can send targeted pushes
                    fetch("/api/notifications/register-device", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            token: token.value,
                            platform: window.Capacitor?.getPlatform() ?? "unknown"
                        })
                    }).catch(() => { })
                })

                // Handle push notification received while app is open
                const notifListener = await PushNotifications.addListener(
                    "pushNotificationReceived",
                    async (notification) => {
                        await Haptics.impact({ style: ImpactStyle.Light })
                        // Show as local notification if app is in foreground
                        await LocalNotifications.schedule({
                            notifications: [{
                                id: Date.now(),
                                title: notification.title ?? "IQ Earners",
                                body: notification.body ?? "",
                                schedule: { at: new Date(Date.now() + 300) },
                                smallIcon: "ic_stat_icon",
                                iconColor: "#F5B301",
                                extra: notification.data
                            }]
                        })
                    }
                )

                // Handle notification tap (app in background/killed)
                const actionListener = await PushNotifications.addListener(
                    "pushNotificationActionPerformed",
                    (action) => {
                        const data = action.notification.data
                        if (data?.url) {
                            router.push(data.url)
                        } else if (data?.route) {
                            router.push(data.route)
                        } else {
                            router.push("/home")
                        }
                    }
                )

                // Handle local notification tap
                const localTapListener = await LocalNotifications.addListener(
                    "localNotificationActionPerformed",
                    (action) => {
                        const extra = action.notification.extra
                        if (extra?.route) router.push(extra.route)
                    }
                )

                // ── Back Button (Android) ─────────────────────────────────
                const backListener = await App.addListener("backButton", ({ canGoBack }) => {
                    if (canGoBack) {
                        router.back()
                    } else {
                        App.minimizeApp()
                    }
                })

                // ── Deep Links ────────────────────────────────────────────
                const urlOpenListener = await App.addListener("appUrlOpen", (event) => {
                    try {
                        const url = new URL(event.url)
                        const path = url.pathname + url.search
                        if (path && path !== "/") router.push(path)
                    } catch { }
                })

                // ── App State (resume from background) ────────────────────
                const stateListener = await App.addListener("appStateChange", ({ isActive }) => {
                    if (isActive) {
                        // Refresh data when app comes back to foreground
                        try {
                            window.dispatchEvent(new CustomEvent("app-resume"))
                        } catch { }
                    }
                })

                cleanup = [
                    () => tokenListener.remove(),
                    () => notifListener.remove(),
                    () => actionListener.remove(),
                    () => localTapListener.remove(),
                    () => backListener.remove(),
                    () => urlOpenListener.remove(),
                    () => stateListener.remove(),
                ]
            } catch (e) {
                // Fail silently — non-native or plugin not available
            }
        }

        initCapacitor()
        return () => cleanup.forEach((fn) => fn())
    }, [router])

    // Render nothing — this is a headless bridge component
    return null
}

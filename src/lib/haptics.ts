export type HapticWeight = "light" | "medium" | "heavy"

/** Dynamic-imports Capacitor so web bundles stay smaller on first paint. */
export async function triggerHapticImpact(style: HapticWeight = "light") {
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics")
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const
    await Haptics.impact({ style: map[style] })
  } catch {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(style === "heavy" ? [12, 8, 12] : style === "medium" ? [10, 6] : 8)
    }
  }
}

export async function triggerHapticSuccess() {
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics")
    await Haptics.notification({ type: NotificationType.Success })
  } catch {
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate([10, 30, 20])
    }
  }
}

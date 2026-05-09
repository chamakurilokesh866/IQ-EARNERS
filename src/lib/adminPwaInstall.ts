/** Fired by {@link InstallPrompt} on admin URLs so those pages can own `beforeinstallprompt`. */
export const IQ_DEFERRED_INSTALL_EVENT = "iq-deferred-install"

export type BeforeInstallPromptEventType = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function isAdminStandalonePwa(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

export const ADMIN_INSTALL_FORWARD_PREFIXES = ["/more/admin-dashboard", "/more/admin-login"] as const

export function shouldForwardInstallPromptToAdmin(pathname: string): boolean {
  return ADMIN_INSTALL_FORWARD_PREFIXES.some((p) => pathname.startsWith(p))
}

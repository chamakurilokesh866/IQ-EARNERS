"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Theme = "dark" | "light"

const STORAGE_KEY = "iq_theme"

export function applyThemeToDocument() {
  if (typeof document === "undefined") return
  const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark"
  const next: Theme = stored === "light" ? "light" : "dark"
  document.documentElement.setAttribute("data-theme", next)
  document.documentElement.style.colorScheme = next
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  /** No-op — kept so existing callers do not break. */
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const next: Theme = stored === "light" ? "light" : "dark"
      setThemeState(next)
      document.documentElement.setAttribute("data-theme", next)
      document.documentElement.style.colorScheme = next
    } catch {
      setThemeState("dark")
      document.documentElement.setAttribute("data-theme", "dark")
      document.documentElement.style.colorScheme = "dark"
    }
  }, [])

  const setTheme = useCallback((t: Theme) => {
    const next: Theme = t === "light" ? "light" : "dark"
    setThemeState(next)
    document.documentElement.setAttribute("data-theme", next)
    document.documentElement.style.colorScheme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark"
      document.documentElement.setAttribute("data-theme", next)
      document.documentElement.style.colorScheme = next
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}

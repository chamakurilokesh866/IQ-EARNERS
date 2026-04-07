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

/** App is quiz-themed dark only; appearance toggle removed. */
export type Theme = "dark"

const STORAGE_KEY = "iq_theme"

export function applyThemeToDocument() {
  if (typeof document === "undefined") return
  document.documentElement.setAttribute("data-theme", "dark")
  document.documentElement.style.colorScheme = "dark"
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  /** No-op — kept so existing callers do not break. */
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme] = useState<Theme>("dark")

  useEffect(() => {
    applyThemeToDocument()
    try {
      localStorage.setItem(STORAGE_KEY, "dark")
    } catch {
      /* ignore */
    }
  }, [])

  const setTheme = useCallback((_t: Theme) => {
    applyThemeToDocument()
    try {
      localStorage.setItem(STORAGE_KEY, "dark")
    } catch {
      /* ignore */
    }
  }, [])

  const toggleTheme = useCallback(() => {
    applyThemeToDocument()
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

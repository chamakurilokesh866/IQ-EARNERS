"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

type QuizFullscreenContextValue = {
  isActive: boolean
  setActive: (active: boolean) => void
}

const Ctx = createContext<QuizFullscreenContextValue | null>(null)

export function QuizFullscreenProvider({ children }: { children: React.ReactNode }) {
  const [isActive, setActive] = useState(false)
  const value = useMemo(() => ({ isActive, setActive }), [isActive])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useQuizFullscreen() {
  const v = useContext(Ctx)
  if (!v) return { isActive: false, setActive: () => {} }
  return v
}

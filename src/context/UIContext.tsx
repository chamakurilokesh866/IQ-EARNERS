"use client"

import { createContext, useContext, useMemo, useState } from "react"

type TransitionState = { from: string; to: string } | null

type UIState = {
  participantsOpen: boolean
  setParticipantsOpen: (v: boolean) => void
  loading: boolean
  setLoading: (v: boolean) => void
  transition: TransitionState
  setTransition: (from: string | null, to: string | null) => void
}

const Ctx = createContext<UIState | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [participantsOpen, setParticipantsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transition, setTransitionState] = useState<TransitionState>(null)
  const setTransition = (from: string | null, to: string | null) => {
    if (from === null && to === null) setTransitionState(null)
    else if (from != null && to != null) setTransitionState({ from, to })
  }
  const value = useMemo(() => ({ participantsOpen, setParticipantsOpen, loading, setLoading, transition, setTransition }), [participantsOpen, loading, transition])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUI() {
  const v = useContext(Ctx)
  if (!v) throw new Error("UIContext not found")
  return v
}

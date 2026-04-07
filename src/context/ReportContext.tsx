"use client"

import { createContext, useCallback, useContext, useState } from "react"
import ReportModal from "@/components/ReportModal"

type ReportContextValue = {
  openReport: () => void
}

const Ctx = createContext<ReportContextValue | null>(null)

export function ReportProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openReport = useCallback(() => setOpen(true), [])
  return (
    <Ctx.Provider value={{ openReport }}>
      {children}
      {open && (
        <ReportModal
          onClose={() => setOpen(false)}
        />
      )}
    </Ctx.Provider>
  )
}

export function useReport() {
  const v = useContext(Ctx)
  return v ?? { openReport: () => {} }
}

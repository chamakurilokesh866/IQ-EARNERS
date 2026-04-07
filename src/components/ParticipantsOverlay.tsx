"use client"

import { useEffect, useState } from "react"
import { useUI } from "../context/UIContext"
import Link from "next/link"

export default function ParticipantsOverlay() {
  const { participantsOpen } = useUI()
  const [items, setItems] = useState<any[]>([])
  useEffect(() => {
    if (!participantsOpen) return
    fetch("/api/participants", { cache: "no-store" }).then((r) => r.json()).then((j) => setItems(j.data ?? [])).catch(() => setItems([]))
  }, [participantsOpen])
  if (!participantsOpen) return null
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="card w-72 max-h-64 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Live Participants</div>
          <Link href="/intro" className="pill bg-primary text-xs">Log in</Link>
        </div>
        <div className="mt-3 overflow-y-auto" style={{ maxHeight: "9rem" }}>
          {!items.length ? (
            <div className="text-sm text-navy-300">No participants yet</div>
          ) : (
            <ul className="space-y-2">
              {items.map((p, idx) => (
                <li key={p.id ?? idx} className="flex items-center justify-between rounded bg-navy-700 px-3 py-2 text-sm">
                  <span>{p.name}</span>
                  <span className="text-navy-300">{p.badge ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"

type Participant = { name: string; minutesAgo?: number; badge?: string }

export default function ParticipantsList() {
  const [participants, setParticipants] = useState<Participant[]>([])

  useEffect(() => {
    fetch("/api/participants", { cache: "no-store" }).then((r) => r.json()).then((j) => setParticipants(j.data ?? [])).catch(() => setParticipants([]))
  }, [])

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Live Participants</div>
        <div className="text-sm text-success">{participants.length} Enrolled</div>
      </div>
      {participants.length ? (
        <ul className="mt-4 max-h-96 overflow-y-auto space-y-2">
          {participants.map((p, idx) => (
            <li key={idx} className="flex items-center justify-between rounded bg-navy-700 p-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-navy-600" />
                <div>
                  <div className="font-medium">{p.name}</div>
                  {p.minutesAgo != null && <div className="text-xs text-navy-300">joined {p.minutesAgo} mins ago</div>}
                </div>
              </div>
              {p.badge && <span className="pill bg-primary">{p.badge}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 text-sm text-navy-300">No participants yet</div>
      )}
    </div>
  )
}

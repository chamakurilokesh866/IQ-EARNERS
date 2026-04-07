"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { XIcon } from "./AnimatedIcons"

const SEEN_KEY = "notice_seen_ids"
const HIDE_PATHS = ["/intro", "/maintenance", "/create-username", "/payment", "/login"]

export default function NoticeBanner() {
  const pathname = usePathname() ?? ""
  const [notice, setNotice] = useState<{ id: string; title: string; body: string; url?: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    fetch("/api/notices", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const d = j?.data
        if (d?.id && d?.title) {
          try {
            const seen = new Set(JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]"))
            if (!seen.has(d.id)) setNotice(d)
          } catch {
            setNotice(d)
          }
        }
      })
      .catch(() => { })
  }, [])
  const dismiss = () => {
    if (notice) {
      try {
        const seen = new Set(JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]"))
        seen.add(notice.id)
        window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
      } catch { }
    }
    setDismissed(true)
    setNotice(null)
  }
  if (HIDE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null
  if (!notice || dismissed) return null
  return (
    <div className="fixed top-16 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-40 animate-pop">
      <div className="card p-4 border-l-4 border-primary shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">{notice.title}</div>
            {notice.body && <div className="mt-1 text-sm text-navy-300">{notice.body}</div>}
            <div className="mt-3 flex items-center gap-2">
              {notice.url ? (
                <Link href={notice.url} className="pill bg-primary text-black text-sm font-medium" onClick={dismiss}>
                  View
                </Link>
              ) : (
                <Link href="/home" className="pill bg-primary text-black text-sm font-medium" onClick={dismiss}>
                  Got it
                </Link>
              )}
              <button type="button" className="pill bg-navy-700 text-sm" onClick={dismiss}>
                Dismiss
              </button>
            </div>
          </div>
          <button type="button" onClick={dismiss} className="shrink-0 text-navy-400 hover:text-white" aria-label="Close">
            <XIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

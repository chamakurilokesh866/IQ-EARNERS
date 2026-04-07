"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { countryToFlag, COUNTRIES, DEFAULT_COUNTRY } from "../utils/countries"

export default function CountryPicker({
  value = DEFAULT_COUNTRY,
  onChange,
  size = "md",
  className = ""
}: {
  value?: string
  onChange: (code: string) => void
  size?: "sm" | "md"
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const current = COUNTRIES.find((c) => c.code === value) ?? COUNTRIES[0]
  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const W = 224
      const H = 280
      let left = rect.left
      let top = rect.bottom + 4
      if (left + W > window.innerWidth) left = window.innerWidth - W - 8
      if (left < 8) left = 8
      if (top + H > window.innerHeight - 8) top = rect.top - H - 4
      if (top < 8) top = 8
      setPosition({ top, left })
    }
  }, [open])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target) || btnRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("click", h)
    return () => document.removeEventListener("click", h)
  }, [])

  const sizeClass = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base"

  const dropdown = open && typeof document !== "undefined" && (
    <div
      ref={ref}
      className="fixed z-[9999] w-56 max-h-64 overflow-hidden rounded-xl bg-navy-800 border border-navy-600 shadow-xl animate-pop"
      style={{ top: position.top, left: position.left }}
    >
      <input
        type="text"
        placeholder="Search country..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-navy-700 border-b border-navy-600 focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <ul className="max-h-48 overflow-y-auto py-1">
        {filtered.map((c) => (
          <li key={c.code}>
            <button
              type="button"
              onClick={() => {
                onChange(c.code)
                setOpen(false)
                setSearch("")
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-navy-700 ${value === c.code ? "bg-primary/20" : ""}`}
            >
              <span className="text-lg">{countryToFlag(c.code)}</span>
              <span>{c.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${sizeClass} rounded-full flex items-center justify-center bg-navy-700 border-2 border-navy-600 hover:border-primary/50 transition-base shrink-0`}
        title={current.name}
      >
        {countryToFlag(current.code)}
      </button>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}

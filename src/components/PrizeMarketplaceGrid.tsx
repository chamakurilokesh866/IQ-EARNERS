"use client"

import { useEffect, useMemo, useState } from "react"
import ProgressBar from "./ProgressBar"

const DEFAULT_IMAGE = "/images/gift.svg"
const FALLBACK_CATEGORIES = ["General", "Phones", "Laptops", "Tablets", "Cameras", "Vouchers", "Travel"]

function normalizeItem(raw: any): {
  id: string
  title: string
  category: string
  image: string
  description: string
  price?: string
  spotsLeft: number
  totalSpots: number
} {
  const totalSpots = Math.max(0, Number(raw?.totalSpots) ?? 10)
  const spotsLeft = Math.max(0, Math.min(totalSpots, Number(raw?.spotsLeft) ?? totalSpots))
  return {
    id: String(raw?.id ?? raw?.title ?? Math.random()),
    title: String(raw?.title ?? "Prize"),
    category: String(raw?.category ?? "General"),
    image: raw?.image && /^https?:\/\//i.test(raw.image) ? raw.image : (raw?.image || DEFAULT_IMAGE),
    description: String(raw?.description ?? ""),
    price: raw?.price ? String(raw.price) : undefined,
    spotsLeft,
    totalSpots
  }
}

function Card({
  id,
  title,
  category,
  image,
  description,
  price,
  spotsLeft,
  totalSpots,
  onEnroll
}: {
  id: string
  title: string
  category: string
  image: string
  description: string
  price?: string
  spotsLeft: number
  totalSpots: number
  onEnroll?: (id: string) => void
}) {
  const percentage = totalSpots > 0 ? Math.round(((totalSpots - spotsLeft) / totalSpots) * 100) : 0
  const canEnroll = spotsLeft > 0
  return (
    <div className="card overflow-hidden transition-base hover-lift animate-slide-up">
      <img className="h-40 w-full object-cover transition-base bg-navy-700" src={image} alt={title} onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE }} />
      <div className="p-5">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="font-semibold truncate">{title}</div>
          <span className="pill bg-navy-700 shrink-0">{category}</span>
        </div>
        {price && <div className="mt-1 num-accent">{price}</div>}
        <p className="mt-2 text-sm text-navy-300 line-clamp-2">{description || "Win this prize by competing in quizzes."}</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-navy-300">Spots filled</span>
            <span className="font-medium num-display">{percentage}%</span>
          </div>
          <ProgressBar value={percentage} />
          <div className="text-xs text-navy-300 num-display">{spotsLeft} spots left</div>
        </div>
        <button
          className="mt-4 w-full btn btn-accent py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => canEnroll && onEnroll?.(id)}
          disabled={!canEnroll}
        >
          {canEnroll ? "Enroll" : "Fully Booked"}
        </button>
      </div>
    </div>
  )
}

export default function PrizeMarketplaceGrid({ category, categories }: { category: string; categories?: string[] }) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reload = () => {
    setLoading(true)
    fetch("/api/prizes")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((j) => setItems(Array.isArray(j?.data) ? j.data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch("/api/prizes")
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((j) => mounted && setItems(Array.isArray(j?.data) ? j.data : []))
      .catch((e) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])
  const normalized = useMemo(() => items.map(normalizeItem), [items])
  const filtered = useMemo(() => {
    if (!category || category === "All") return normalized
    return normalized.filter((i) => i.category === category)
  }, [category, normalized])
  const onEnroll = async (id: string) => {
    await fetch("/api/prizes/enroll", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {})
    reload()
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {loading && (
        <div className="col-span-full card p-6 text-center text-sm text-navy-300">Loading prizes…</div>
      )}
      {error && !loading && (
        <div className="col-span-full card p-6 text-center text-sm text-primary">Failed to load: {error}</div>
      )}
      {!loading && !error && filtered.map((i) => (
        <Card key={i.id} {...i} onEnroll={onEnroll} />
      ))}
      {!loading && !error && !filtered.length && (
        <div className="col-span-full card p-6 text-center text-sm text-navy-300">No prizes yet. Add prizes in the admin dashboard.</div>
      )}
    </div>
  )
}

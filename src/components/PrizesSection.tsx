"use client"

import { useEffect, useMemo, useState } from "react"
import PrizeCard from "./PrizeCard"

type PrizeItem = {
  id?: string
  title: string
  price?: string
  image?: string
  category?: string
  totalSpots?: number
  spotsLeft?: number
  description?: string
}

export default function PrizesSection() {
  const [items, setItems] = useState<PrizeItem[]>([])
  const [filter, setFilter] = useState<string>("All")
  const [sort, setSort] = useState<"popular" | "spots" | "price">("popular")
  useEffect(() => {
    fetch("/api/prizes", { cache: "no-store" }).then((r) => r.json()).then((j) => setItems(j.data ?? [])).catch(() => setItems([]))
  }, [])
  const categories = useMemo(() => {
    const s = new Set<string>()
    items.forEach((i: any) => s.add(i.category ?? "General"))
    return ["All", ...Array.from(s)]
  }, [items])
  const shown = useMemo(() => {
    let arr = items.slice()
    if (filter !== "All") arr = arr.filter((i) => (i.category ?? "General") === filter)
    if (sort === "spots") arr.sort((a, b) => (Number(b.spotsLeft ?? 0) - Number(a.spotsLeft ?? 0)))
    if (sort === "price") {
      const toNum = (p?: string) => Number(String(p ?? "").replace(/[^0-9]/g, "")) || 0
      arr.sort((a, b) => toNum(b.price) - toNum(a.price))
    }
    return arr
  }, [items, filter, sort])
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tournament Prizes</h2>
        <div className="flex items-center gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`pill ${filter === c ? "bg-primary" : "bg-navy-700"}`}>{c}</button>
          ))}
          <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="admin-form-field text-sm">
            <option value="popular">Popular</option>
            <option value="spots">Spots Left</option>
            <option value="price">Price</option>
          </select>
        </div>
      </div>
      {!shown.length ? (
        <div className="card p-6 text-sm text-navy-300 animate-fade">No prizes available</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {shown.map((p, idx) => (
            <div key={p.id ?? `${p.title}-${idx}`} className="animate-pop transition-base hover-lift">
              <PrizeCard
                place={`${p.spotsLeft ?? p.totalSpots ?? ""} spots left`}
                title={p.title}
                price={p.price ?? ""}
                imageUrl={p.image ?? "/images/gift.svg"}
                person={p.category ?? "General"}
                quote={p.description ?? ""}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

"use client"

import { useState } from "react"

export default function PrizeFilterTabs({ onChange }: { onChange?: (category: string) => void }) {
  const [tab, setTab] = useState<string>("All")
  const tabs = ["All", "Phones", "Laptops", "Tablets", "Cameras", "Vouchers", "Travel"]
  const select = (t: string) => {
    setTab(t)
    onChange?.(t)
  }
  return (
    <div className="scroll-tabs">
      <div className="scroll-tabs-inner">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => select(t)}
            className={`pill shrink-0 ${tab === t ? "bg-primary" : "bg-navy-700"}`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

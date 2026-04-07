"use client"

import Image from "next/image"

export default function PrizeCard({
  place,
  title,
  price,
  imageUrl,
  person,
  quote
}: {
  place: string
  title: string
  price: string
  imageUrl: string
  person: string
  quote: string
}) {
  return (
    <div className="card overflow-hidden cv-auto">
      <div className="relative">
        <Image className="h-40 w-full object-cover" src={imageUrl} alt={title} width={800} height={160} unoptimized />
        <span className="absolute left-3 top-3 pill bg-accent text-black">{place}</span>
      </div>
      <div className="p-5">
        <div className="font-semibold">{title}</div>
        <div className="num-accent">{price}</div>
        <div className="mt-3 text-sm text-navy-300">
          <div className="font-medium">{person}</div>
          <p className="mt-1">{quote}</p>
        </div>
      </div>
    </div>
  )
}

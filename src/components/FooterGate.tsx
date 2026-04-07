"use client"

import { usePathname } from "next/navigation"
import Footer from "./Footer"
import SponsoredBanner from "./SponsoredBanner"

const HIDE_SPONSORED = ["/intro", "/maintenance", "/more/admin"]

export default function FooterGate() {
  const pathname = usePathname() ?? ""
  // Only show footer on the intro page
  if (pathname !== "/intro") return null
  const hideSponsored = HIDE_SPONSORED.some((p) => pathname === p || pathname.startsWith(p + "/"))
  return (
    <div className="mt-auto">
      {!hideSponsored && <SponsoredBanner />}
      <Footer />
    </div>
  )
}

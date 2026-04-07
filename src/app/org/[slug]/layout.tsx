import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Organization Portal | IQ Earners",
  robots: "noindex, nofollow",
}

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

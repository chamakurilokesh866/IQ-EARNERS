import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "IQ Earners operations dashboard.",
  alternates: { canonical: `${SITE_URL}/more/admin-dashboard` },
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "IQ Admin",
    statusBarStyle: "black-translucent",
  },
}

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}

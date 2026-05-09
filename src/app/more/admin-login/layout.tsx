import type { Metadata } from "next"
import { SITE_NAME, SITE_URL } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Secure admin sign-in for IQ Earners operations dashboard.",
  alternates: { canonical: `${SITE_URL}/more/admin-login` },
  manifest: "/admin-manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "IQ Admin",
    statusBarStyle: "black-translucent",
  },
}

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children
}

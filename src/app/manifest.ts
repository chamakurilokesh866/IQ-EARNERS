import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IQ Earners",
    short_name: "IQ Earners",
    description: "Quizzes, tournaments, and rewards. Test your knowledge, compete, and win.",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait-primary",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    categories: ["education", "games", "entertainment"],
    shortcuts: [
      {
        name: "Admin Dashboard",
        short_name: "Admin",
        description: "Open IQ Earners admin dashboard",
        url: "/more/admin-dashboard",
        icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "Admin Login",
        short_name: "Admin Login",
        description: "Open admin login",
        url: "/more/admin-login",
        icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    screenshots: [],
    prefer_related_applications: false,
    related_applications: [],
  }
}

import { ImageResponse } from "next/og"

/** Inline strings so this route does not import `@/lib/seo` (avoids prerender issues with env resolution). */
const SITE_NAME = "IQ Earners"
const SITE_TAGLINE = "India's Best Online Quiz Platform"

export const dynamic = "force-dynamic"

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`

export const size = { width: 1200, height: 630 }

export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #06040f 0%, #1e1b4b 42%, #312e81 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 64px",
            borderRadius: 32,
            border: "2px solid rgba(167, 139, 250, 0.35)",
            background: "rgba(15, 22, 40, 0.85)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          }}
        >
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "#f5f3ff",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 34,
              fontWeight: 600,
              color: "#c4b5fd",
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            {SITE_TAGLINE}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}

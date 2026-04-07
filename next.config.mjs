const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  images: {
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  compress: true,
  async rewrites() {
    const rules = [{ source: '/favicon.ico', destination: '/icon.svg' }]
    const renderBackend = process.env.NEXT_PUBLIC_RENDER_BACKEND_URL?.replace(/\/$/, "")
    if (renderBackend) {
      rules.push({
        source: "/render-api/:path*",
        destination: `${renderBackend}/api/:path*`,
      })
    }
    return rules
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production"
    const cacheHeaders = [
      { source: "/_next/static/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/favicon-192.png", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/favicon-512.png", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
    ]
    // CSP: connect-src allows Cashfree, NVIDIA AI, Cloudflare, etc. Restrict further if needed
    const cspParts = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://challenges.cloudflare.com https://sdk.cashfree.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.google-analytics.com https://*.google",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: http: blob:",
      "media-src 'self' https: http: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' data: https: wss: http: https://api.cashfree.com https://sandbox.api.cashfree.com https://integrate.api.nvidia.com https://*.adtrafficquality.google",
      "frame-src 'self' https://challenges.cloudflare.com https://sdk.cashfree.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.google",
      "worker-src 'self' blob:",
      "child-src 'self' https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://api.cashfree.com https://sandbox.api.cashfree.com"
    ]
    if (isProd) cspParts.push("upgrade-insecure-requests")
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Content-Security-Policy", value: cspParts.join("; ") },
      ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }] : []),
    ]
    return [
      ...cacheHeaders,
      { source: "/:path*", headers: securityHeaders },
    ]
  },
}

export default nextConfig

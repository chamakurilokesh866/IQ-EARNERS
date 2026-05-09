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
    return [
      { source: "/favicon.ico", destination: "/logo.svg" },
      { source: "/favicon-192.png", destination: "/logo.svg" },
      { source: "/favicon-512.png", destination: "/logo.svg" },
    ]
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production"
    /** Live Cashfree PG: omit sandbox/test hosts from CSP when this matches server env (see create-order route). */
    const isCashfreeProd = process.env.CASHFREE_ENV === "production"
    const cfSandboxExplicit = isCashfreeProd
      ? ""
      : " https://sandbox.cashfree.com https://sandbox.api.cashfree.com https://payments-test.cashfree.com"
    const cfFormSandbox = isCashfreeProd ? "" : " https://sandbox.api.cashfree.com"
    const cacheHeaders = [
      { source: "/_next/static/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/logo.svg", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/opengraph-image", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
    ]
    // CSP: connect-src allows Cashfree, NVIDIA AI, Cloudflare, etc. Restrict further if needed
    const cspParts = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://challenges.cloudflare.com https://sdk.cashfree.com https://*.cashfree.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.google-analytics.com https://*.google",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: http: blob:",
      "media-src 'self' https: http: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' data: https: wss: http: https://api.cashfree.com https://challenges.cloudflare.com" +
        (isCashfreeProd ? "" : " https://sandbox.api.cashfree.com") +
        " https://integrate.api.nvidia.com https://*.adtrafficquality.google",
      "frame-src 'self' https://challenges.cloudflare.com https://sdk.cashfree.com https://*.cashfree.com https://api.cashfree.com https://payments.cashfree.com" +
        cfSandboxExplicit +
        " https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google https://*.google" +
        " https://*.googlesyndication.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com",
      "worker-src 'self' blob:",
      "child-src 'self' https://challenges.cloudflare.com https://sdk.cashfree.com https://*.cashfree.com https://payments.cashfree.com" +
        (isCashfreeProd ? "" : " https://payments-test.cashfree.com") +
        " https://*.googlesyndication.com https://pagead2.googlesyndication.com https://tpc.googlesyndication.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://api.cashfree.com" + cfFormSandbox
    ]
    if (isProd) cspParts.push("upgrade-insecure-requests")
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: 'camera=(), microphone=(), geolocation=(), usb=(), xr-spatial-tracking=(self "https://challenges.cloudflare.com")',
      },
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

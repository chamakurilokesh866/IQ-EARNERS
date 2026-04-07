#!/usr/bin/env node
/** Run before deploy: NODE_ENV=production node scripts/check-env.js */
const required = ["ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_OTP", "ADMIN_DASHBOARD_SLUG"]
const isProd = process.env.NODE_ENV === "production"
if (!isProd) {
  console.log("Skipping env check (NODE_ENV !== production)")
  process.exit(0)
}
const missing = required.filter((k) => !process.env[k]?.trim())
if (missing.length) {
  console.error("\n❌ Production env missing:", missing.join(", "))
  console.error("   Set these in .env.local or your deployment env\n")
  process.exit(1)
}
console.log("✓ Production env OK")
process.exit(0)

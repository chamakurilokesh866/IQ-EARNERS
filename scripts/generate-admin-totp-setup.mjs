#!/usr/bin/env node
/**
 * One-time setup: prints ADMIN_TOTP_SECRET and an otpauth:// URL for Microsoft/Google Authenticator.
 * Usage: npm run gen:admin-totp
 *        npm run gen:admin-totp -- "My Site" admin@you
 */
import { generateSecret, generateURI } from "otplib"

const issuer = process.argv[2] || "IQ Admin"
const label = process.argv[3] || "admin"

const secret = generateSecret()
const uri = generateURI({ issuer, label, secret })

console.log("")
console.log("--- Admin TOTP setup ---")
console.log("")
console.log("1) Put this in .env.local (or Vercel/hosting env), then redeploy / restart dev:")
console.log("")
console.log(`ADMIN_TOTP_SECRET=${secret}`)
console.log("")
console.log("2) Microsoft Authenticator: Add account → Other (Microsoft) / Work or school if offered →")
console.log("   Scan QR, OR enter setup key manually → choose Time-based → paste the secret.")
console.log("")
console.log("   Secret (Base32, no spaces):")
console.log(secret)
console.log("")
console.log("3) Optional QR: use any QR tool and encode this exact string (Authenticator will scan it):")
console.log(uri)
console.log("")
console.log("4) Remove ADMIN_OTP from production if you relied on it; check-env accepts TOTP OR ADMIN_OTP.")
console.log("")

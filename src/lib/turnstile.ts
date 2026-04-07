/**
 * Cloudflare Turnstile server-side verification.
 * Uses https module per Cloudflare example.
 */
import "dotenv/config"
import https from "https"

const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA"
const TURNSTILE_SECRET_KEY =
  process.env.TURNSTILE_SECRET_KEY?.trim() ??
  process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY?.trim() ??
  (process.env.NODE_ENV === "development" ? TEST_SECRET_KEY : "")

export async function verifyTurnstile(
  token: string,
  remoteip?: string | null
): Promise<{ success: boolean; errorCodes?: string[] }> {
  if (!TURNSTILE_SECRET_KEY?.trim()) {
    if (process.env.NODE_ENV === "production" && token) {
      return { success: false, errorCodes: ["missing-secret"] }
    }
    return { success: true }
  }
  if (!token?.trim()) {
    return { success: false, errorCodes: ["missing-input-response"] }
  }

  return new Promise((resolve) => {
    const params = new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY.trim(),
      response: token.trim()
    })
    if (remoteip?.trim()) params.append("remoteip", remoteip.trim())
    const postData = params.toString()

    const options = {
      hostname: "challenges.cloudflare.com",
      path: "/turnstile/v0/siteverify",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try {
          const response = JSON.parse(data) as { success?: boolean; "error-codes"?: string[] }
          resolve({
            success: response.success === true,
            errorCodes: response["error-codes"]
          })
        } catch {
          resolve({ success: false, errorCodes: ["parse-error"] })
        }
      })
    })
    req.on("error", () => resolve({ success: false, errorCodes: ["request-error"] }))
    req.write(postData)
    req.end()
  })
}

export const verifyTurnstileToken = verifyTurnstile

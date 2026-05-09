/**
 * Manual QR / static UPI payments are often not visible to Cashfree's VBA API, so
 * `bankMatched` may stay null. Set to "true" only if you use Cashfree Auto Collect
 * and want Approve locked until "Verify" returns matched.
 */
export function manualQrRequireBankMatch(): boolean {
  if (process.env.MANUAL_QR_REQUIRE_BANK_MATCH === "true") return true
  if (process.env.NEXT_PUBLIC_MANUAL_QR_REQUIRE_BANK_MATCH === "true") return true
  return false
}

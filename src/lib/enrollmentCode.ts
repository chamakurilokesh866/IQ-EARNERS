/** Generate unique participation code for tournament enrollment. */
export function generateEnrollmentCode(tournamentId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const tid = String(tournamentId).slice(-6).replace(/[^A-Za-z0-9]/g, "0").padStart(6, "0")
  let suffix = ""
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `T-${tid}-${suffix}`
}

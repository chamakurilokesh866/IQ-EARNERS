/** Shared types for security event log (client + server). */

export type SecurityEventType =
  | "webhook_invalid_signature"
  | "webhook_replay"
  | "webhook_unauthorized"
  | "verify_order_denied"
  | "rate_limit"
  | "admin_ip_blocked"

export type SecurityEvent = {
  t: number
  type: SecurityEventType
  ip?: string
  path?: string
  detail?: Record<string, unknown>
}

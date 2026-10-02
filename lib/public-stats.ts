// Shared helpers for the live numbers shown on the marketing landing page

export interface PublicStats {
  certificates: number
  downloads: number
  events: number
  organizations: number
  certificateTypes: number
  generatedAt: string
}

/**
 * Round a live count DOWN to a tidy marketing figure with a "+" suffix, so the
 * number shown is always true (never above the real count).
 *   11,614 -> "11,600+"   3,887 -> "3,800+"   347 -> "340+"   12 -> "12"
 */
export function formatApproxCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value < 20) return value.toLocaleString("en-IN")
  const step = value >= 1000 ? 100 : 10
  const rounded = Math.floor(value / step) * step
  return `${rounded.toLocaleString("en-IN")}+`
}

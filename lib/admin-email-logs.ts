export const EMAIL_STATUSES = ["initiated", "sent", "failed", "read"] as const
export interface AdminEmailLog {
  id: string; to: string; subject: string; template: string
  status: typeof EMAIL_STATUSES[number]; errorMessage?: string
  metadata?: { userName?: string }; createdAt: string; sentAt?: string; readAt?: string; htmlContent?: string
}
export function emailTemplateLabel(value: string) {
  const labels: Record<string, string> = { welcome: "Welcome", emailVerification: "Email verification", passwordReset: "Password reset", paymentSuccess: "Payment confirmation", invoice: "Invoice", adminNotification: "Admin notification", custom: "Custom" }
  return labels[value] || value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ")
}
export function emailLogDate(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—"
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

/** Keep admin previews from executing content or loading email tracking pixels. */
export function emailPreviewDocument(html: string) {
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:;">${html}`
}

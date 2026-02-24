import { NextRequest } from "next/server"
import { emailTemplates } from "@/lib/email"

function getPreview(type: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://certistage.com"

  switch (type) {
    case "verify":
      return emailTemplates.emailVerification(
        "Dhiren Soni",
        `${appUrl}/verify-email?token=preview-token-123`
      )
    case "reset":
      return emailTemplates.passwordReset(
        "Dhiren Soni",
        `${appUrl}/reset-password?token=preview-reset-token-123`
      )
    case "invoice":
      return emailTemplates.invoice({
        invoiceNumber: "INV-2026-0001",
        customerName: "Dhiren Soni",
        customerEmail: "radhanpuradhiren@gmail.com",
        customerPhone: "+91 99999 99999",
        customerOrganization: "Client Organization",
        planName: "Premium",
        amount: 1199900,
        gatewayFee: 0,
        totalAmount: 1199900,
        paymentId: "pay_preview_123456789",
        paymentDate: new Date(),
        validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        invoiceUrl: `${appUrl}/api/invoices/INV-2026-0001/pdf`,
      })
    case "welcome":
    default:
      return emailTemplates.welcome("Dhiren Soni")
  }
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "welcome"
  const preview = getPreview(type)

  return new Response(preview.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}

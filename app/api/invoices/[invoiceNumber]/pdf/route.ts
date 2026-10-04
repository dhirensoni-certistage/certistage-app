import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Payment from "@/models/Payment"
import { renderInvoicePdf } from "@/lib/invoice-pdf.server"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import { getClientUserId } from "@/lib/client-auth.server"
import { verifyAdminToken } from "@/lib/admin-auth"

export const runtime = "nodejs"

// A receipt carries the customer's name, email and phone: only its owner (signed in) or an admin can open it.
// The receipt email has the PDF attached, so customers rarely need this link.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params

    await connectDB()

    let payment: any = await Payment.findOne({
      invoiceNumber,
      status: "success",
    }).populate("userId", "name email phone organization")

    const isAdmin = !!(await verifyAdminToken(request))

    if (!payment && isAdmin && (invoiceNumber === "INV-2026-0001" || invoiceNumber.toLowerCase() === "preview")) {
      payment = {
        invoiceNumber: "INV-2026-0001",
        invoiceIssuedAt: new Date(),
        createdAt: new Date(),
        invoiceBaseAmount: 1199900,
        invoiceGatewayFee: 0,
        amount: 1199900,
        plan: "premium",
        paymentId: "pay_preview_123456789",
        userId: {
          name: "Dhiren Soni",
          email: "radhanpuradhiren@gmail.com",
          phone: "+91 99999 99999",
          organization: "CertiStage",
        },
      }
    }

    if (!payment) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }
    if (!isAdmin) {
      const userId = await getClientUserId(request)
      const ownerId = String(payment.userId?._id || payment.userId || "")
      if (!userId) {
        // Sent from an email link: sign in first, then come back to the Billing page
        return NextResponse.redirect(new URL("/client/login?callbackUrl=/client/billing", request.url))
      }
      if (userId !== ownerId) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
      }
    }

    const planName = getPlanMap(await getPlanConfigFromDb())[payment.plan]?.name
    const pdfBuffer = await renderInvoicePdf(payment, payment.userId, planName)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${payment.invoiceNumber}.pdf\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Invoice PDF generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    )
  }
}

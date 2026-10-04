import Payment from "@/models/Payment"
import User from "@/models/User"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"

/**
 * Receipt to the customer, email to the admin and the admin panel notification for a
 * successful plan payment. Sent exactly once per payment, by whichever path completes it
 * first (browser verify, Razorpay webhook or admin sync), so a webhook that wins the race
 * no longer means "no emails". Never throws.
 */
export async function sendPlanPaymentEmails(orderId: string): Promise<void> {
  try {
    // Claim the send atomically so two paths never both send
    const payment = await Payment.findOneAndUpdate(
      // Add-on purchases send their own receipt (completeAddonPayment)
      { orderId, status: "success", kind: { $ne: "addon" }, receiptSentAt: { $exists: false } },
      { $set: { receiptSentAt: new Date() } },
      { new: true }
    )
    if (!payment) return

    const user = await User.findById(payment.userId)
    if (!user) return

    const planName = getPlanMap(await getPlanConfigFromDb())[payment.plan]?.name
      || payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://certistage.com"
    const invoiceNumber = payment.invoiceNumber || ""
    const paidAt = payment.invoiceIssuedAt || payment.updatedAt || new Date()
    const validUntil = user.planExpiresAt || new Date(paidAt.getTime() + 365 * 24 * 60 * 60 * 1000)

    // Optional PDF link template: INVOICE_PDF_URL_TEMPLATE with {invoiceNumber}, {paymentId}, {userId}
    const template = process.env.INVOICE_PDF_URL_TEMPLATE
    const invoiceUrl = template
      ? template
          .replace("{invoiceNumber}", encodeURIComponent(invoiceNumber))
          .replace("{paymentId}", encodeURIComponent(payment.paymentId || ""))
          .replace("{userId}", encodeURIComponent(String(user._id)))
      : `${appUrl}/api/invoices/${encodeURIComponent(invoiceNumber)}/pdf`

    try {
      const Notification = (await import("@/models/Notification")).default
      await Notification.create({
        type: "payment",
        title: "Payment Received",
        description: `${user.name} upgraded to ${planName} - ₹${Math.round(payment.amount / 100)}`,
        userId: user._id,
        metadata: { userName: user.name, userEmail: user.email, plan: planName, amount: payment.amount, paymentId: payment.paymentId },
        read: false
      })
    } catch (error) {
      console.error("Failed to create payment notification:", error)
    }

    const { sendEmail, emailTemplates } = await import("@/lib/email")
    const adminCCEmail = process.env.ADMIN_CC_EMAIL
    const metadata = { userId: String(user._id), userName: user.name, plan: planName, amount: payment.amount, paymentId: payment.paymentId }

    const invoice = emailTemplates.invoice({
      invoiceNumber,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone,
      customerOrganization: user.organization,
      planName,
      amount: payment.invoiceBaseAmount ?? payment.amount,
      gatewayFee: payment.invoiceGatewayFee || 0,
      totalAmount: payment.amount,
      paymentId: payment.paymentId || "",
      paymentDate: paidAt,
      validUntil,
      invoiceUrl
    })
    await sendEmail({
      to: user.email,
      subject: invoice.subject,
      html: invoice.html,
      cc: adminCCEmail,
      template: "invoice",
      metadata: { ...metadata, type: "payment_invoice" }
    })

    if (process.env.ADMIN_EMAIL) {
      const admin = emailTemplates.adminNotification("payment", {
        userName: user.name,
        userEmail: user.email,
        plan: planName,
        amount: payment.amount,
        paymentId: payment.paymentId
      })
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: admin.subject,
        html: admin.html,
        cc: adminCCEmail,
        template: "adminNotification",
        metadata: { ...metadata, type: "payment_notification" }
      })
    }
  } catch (error) {
    console.error("Failed to send plan payment emails:", error)
  }
}

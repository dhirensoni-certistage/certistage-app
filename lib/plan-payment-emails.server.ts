import Payment from "@/models/Payment"
import User from "@/models/User"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import { planExpiryFrom, planTermLabel } from "@/lib/plan-config"
import { renderInvoicePdf } from "@/lib/invoice-pdf.server"

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

    const planCfg = getPlanMap(await getPlanConfigFromDb())[payment.plan]
    const planName = planCfg?.name
      || payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)
    const invoiceNumber = payment.invoiceNumber || ""
    const paidAt = payment.invoiceIssuedAt || payment.updatedAt || new Date()
    const validUntil = user.planExpiresAt || planExpiryFrom(planCfg, paidAt)
    const term = planTermLabel(planCfg)

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
      term,
      amount: payment.invoiceBaseAmount ?? payment.amount,
      gatewayFee: payment.invoiceGatewayFee || 0,
      totalAmount: payment.amount,
      paymentId: payment.paymentId || "",
      paymentDate: paidAt,
      validUntil
    })
    // The PDF receipt goes with the email; if it can't be made, the email still goes out
    let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined
    try {
      const pdf = await renderInvoicePdf(payment, user, planName)
      attachments = [{ filename: `CertiStage-Receipt-${invoiceNumber || "payment"}.pdf`, content: pdf, contentType: "application/pdf" }]
    } catch (error) {
      console.error("Failed to render receipt PDF for email:", error)
    }

    await sendEmail({
      to: user.email,
      subject: invoice.subject,
      html: invoice.html,
      cc: adminCCEmail,
      attachments,
      template: "invoice",
      metadata: { ...metadata, type: "payment_invoice" }
    })

    if (process.env.ADMIN_EMAIL) {
      const admin = emailTemplates.adminNotification("payment", {
        userName: user.name,
        userEmail: user.email,
        plan: planName,
        amount: payment.amount,
        paymentId: payment.paymentId,
        invoiceNumber
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

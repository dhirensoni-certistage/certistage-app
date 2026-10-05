import connectDB from "@/lib/mongodb"
import Payment from "@/models/Payment"
import Settings from "@/models/Settings"
import User from "@/models/User"
import { emailPackName } from "@/lib/addons"

/** Razorpay keys: admin payment settings first, then env (same order as plan payments) */
export async function getRazorpayKeys(): Promise<{ keyId?: string; keySecret?: string }> {
  let keyId: string | undefined
  let keySecret: string | undefined
  try {
    await connectDB()
    const setting = await Settings.findOne({ key: "payment_config" })
    keyId = setting?.value?.razorpay?.keyId
    keySecret = setting?.value?.razorpay?.keySecret
  } catch (error) {
    console.error("Failed to read payment config:", error)
  }
  return { keyId: keyId || process.env.RAZORPAY_KEY_ID, keySecret: keySecret || process.env.RAZORPAY_KEY_SECRET }
}

function invoiceNumber(): string {
  const now = new Date()
  return `INV-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
}

/**
 * Marks an add-on order paid and adds what was bought to the account. Safe to call from the
 * browser's verify call, the Razorpay webhook and the admin sync alike: the emails are added
 * exactly once (creditsGrantedAt), and only that first call sends the receipt.
 */
export async function completeAddonPayment(orderId: string, paymentId?: string, source: "verify" | "webhook" | "sync" = "verify") {
  await connectDB()
  const now = new Date()
  const paid = await Payment.findOneAndUpdate(
    { orderId, kind: "addon" },
    {
      $set: {
        status: "success",
        ...(paymentId ? { paymentId } : {}),
        ...(source === "webhook" ? { webhookVerified: true } : {})
      }
    },
    { new: true }
  )
  if (!paid) return { granted: false, payment: null }
  if (!paid.invoiceNumber) {
    await Payment.updateOne(
      { _id: paid._id, invoiceNumber: { $exists: false } },
      { $set: { invoiceNumber: invoiceNumber(), invoiceIssuedAt: now, invoiceBaseAmount: paid.amount, invoiceGatewayFee: 0 } }
    )
  }

  const claimed = await Payment.findOneAndUpdate(
    { _id: paid._id, creditsGrantedAt: { $exists: false } },
    { $set: { creditsGrantedAt: now } },
    { new: true }
  )
  if (!claimed) return { granted: false, payment: await Payment.findById(paid._id) }

  const emails = claimed.addonEmails || 0
  const user = await User.findByIdAndUpdate(claimed.userId, { $inc: { emailCredits: emails } }, { new: true })
  const itemName = emailPackName({ emails })

  try {
    const Notification = (await import("@/models/Notification")).default
    await Notification.create({
      type: "payment",
      title: "Add-on purchased",
      description: `${user?.name || "A customer"} bought ${itemName} - ₹${Math.round(claimed.amount / 100)}`,
      userId: claimed.userId,
      metadata: { userName: user?.name, userEmail: user?.email, addon: claimed.addonId, amount: claimed.amount, paymentId: claimed.paymentId },
      read: false
    })
  } catch (error) {
    console.error("Failed to create add-on notification:", error)
  }

  if (user?.email) {
    try {
      const { sendEmail, renderAddonReceipt } = await import("@/lib/email")
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")
      const fresh = await Payment.findById(claimed._id)
      const number = fresh?.invoiceNumber || ""
      const receipt = renderAddonReceipt({
        invoiceNumber: number,
        customerName: user.name,
        customerEmail: user.email,
        itemName,
        amount: claimed.amount,
        paymentId: claimed.paymentId || "",
        paymentDate: now,
        invoiceUrl: number ? `${appUrl}/api/invoices/${encodeURIComponent(number)}/pdf` : undefined
      })
      // PDF receipt attached, as for plan payments; the email still goes out if it can't be made
      let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined
      try {
        const { renderInvoicePdf } = await import("@/lib/invoice-pdf.server")
        attachments = [{ filename: `CertiStage-Receipt-${number || "payment"}.pdf`, content: await renderInvoicePdf(fresh, user), contentType: "application/pdf" }]
      } catch (error) {
        console.error("Failed to render add-on receipt PDF:", error)
      }
      await sendEmail({
        to: user.email,
        subject: receipt.subject,
        html: receipt.html,
        cc: process.env.ADMIN_CC_EMAIL,
        attachments,
        template: "invoice",
        metadata: { userId: String(user._id), userName: user.name, type: "addon_invoice", addon: claimed.addonId, amount: claimed.amount }
      })
    } catch (error) {
      console.error("Failed to send add-on receipt:", error)
    }
  }

  return { granted: true, payment: await Payment.findById(claimed._id) }
}

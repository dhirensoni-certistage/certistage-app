import mongoose from "mongoose"
import EmailDelivery from "@/models/EmailDelivery"
import Recipient from "@/models/Recipient"

export type EmailEvent =
  | { type: "delivered" }
  | { type: "open" }
  | { type: "click" }
  | { type: "bounce"; hard: boolean; reason?: string }
  | { type: "complaint" }

/** Applies an open, click, delivery, bounce or spam report to one Email log entry */
export async function recordEmailEvent(id: string, event: EmailEvent, at = new Date()): Promise<void> {
  if (!mongoose.isValidObjectId(id)) return
  const _id = new mongoose.Types.ObjectId(id)
  // An open or click proves delivery
  const proveDelivery = () =>
    Promise.all([
      EmailDelivery.updateOne({ _id, deliveredAt: { $exists: false } }, { $set: { deliveredAt: at } }),
      EmailDelivery.updateOne({ _id, status: { $in: ["sending", "sent"] } }, { $set: { status: "delivered" } })
    ])

  switch (event.type) {
    case "delivered":
      await proveDelivery()
      return
    case "open":
      await EmailDelivery.updateOne({ _id }, { $inc: { openCount: 1 } })
      await EmailDelivery.updateOne({ _id, openedAt: { $exists: false } }, { $set: { openedAt: at } })
      await proveDelivery()
      return
    case "click":
      await EmailDelivery.updateOne({ _id }, { $inc: { clickCount: 1 } })
      await EmailDelivery.updateOne({ _id, clickedAt: { $exists: false } }, { $set: { clickedAt: at } })
      await EmailDelivery.updateOne({ _id, openedAt: { $exists: false } }, { $set: { openedAt: at } })
      await proveDelivery()
      return
    case "bounce": {
      const reason = (event.reason || (event.hard ? "Address does not exist" : "Temporarily rejected")).slice(0, 300)
      const log = await EmailDelivery.findOneAndUpdate(
        { _id, status: { $ne: "complained" } },
        { $set: { status: "bounced", bouncedAt: at, bounceType: event.hard ? "hard" : "soft", error: reason } },
        { new: true }
      ).lean<{ recipientId: mongoose.Types.ObjectId; to: string }>()
      // A dead address is not emailed again until the organizer corrects it
      if (log && event.hard) {
        await Recipient.updateOne(
          { _id: log.recipientId, email: log.to },
          { $set: { lastEmailStatus: "failed", lastEmailError: `Bounced: ${reason}` } }
        )
      }
      return
    }
    case "complaint":
      await EmailDelivery.updateOne({ _id }, { $set: { status: "complained", complainedAt: at } })
      return
  }
}

/**
 * ZeptoMail reports bounces but has no "delivered" event, so a ZeptoMail email counts as
 * delivered once it has gone this long without bouncing (most bounces arrive within minutes).
 */
export const DELIVERY_GRACE_MINUTES = 15
export const PROVIDERS_WITHOUT_DELIVERY_EVENT = ["zeptomail"]

export const deliveryGraceCutoff = (now = new Date()) => new Date(now.getTime() - DELIVERY_GRACE_MINUTES * 60 * 1000)

/** Mongo condition: delivered (reported, proven by an open, or past the grace period) */
export function deliveredCondition(now = new Date()): Record<string, unknown> {
  return {
    $or: [
      { deliveredAt: { $exists: true } },
      { status: "delivered" },
      { openedAt: { $exists: true } },
      { status: "sent", provider: { $in: PROVIDERS_WITHOUT_DELIVERY_EVENT }, sentAt: { $lte: deliveryGraceCutoff(now) } }
    ]
  }
}

/** What the Email log shows, from most to least important */
export function displayStatus(d: {
  status: string
  provider?: string
  sentAt?: Date | null
  deliveredAt?: Date | null
  openedAt?: Date | null
  clickedAt?: Date | null
}, now = new Date()): "failed" | "bounced" | "spam" | "clicked" | "opened" | "delivered" | "sent" | "sending" {
  if (d.status === "failed") return "failed"
  if (d.status === "bounced") return "bounced"
  if (d.status === "complained") return "spam"
  if (d.clickedAt) return "clicked"
  if (d.openedAt) return "opened"
  if (d.deliveredAt || d.status === "delivered") return "delivered"
  if (d.status === "sending") return "sending"
  if (d.provider && PROVIDERS_WITHOUT_DELIVERY_EVENT.includes(d.provider) && d.sentAt && new Date(d.sentAt) <= deliveryGraceCutoff(now)) return "delivered"
  return "sent"
}

import crypto from "crypto"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import User from "@/models/User"

/**
 * Google sign-ups are created by the NextAuth MongoDB adapter, which stores only
 * name, email, image and emailVerified. These helpers add the fields the app expects
 * (plan, isActive, createdAt, ...) without touching anything already set.
 */

type RawUser = Record<string, unknown> & { _id: mongoose.Types.ObjectId }

async function missingFields(doc: RawUser): Promise<Record<string, unknown>> {
  const set: Record<string, unknown> = {}
  if (doc.plan === undefined) set.plan = "free"
  if (doc.pendingPlan === undefined) set.pendingPlan = null
  if (doc.isActive === undefined) set.isActive = true
  if (doc.isEmailVerified === undefined) set.isEmailVerified = true
  if (doc.phone === undefined) set.phone = ""
  if (doc.organization === undefined) set.organization = ""
  if (!doc.name) set.name = String(doc.email || "").split("@")[0] || "User"
  // Sign-in is by Google or email code only; a random password keeps the field consistent
  if (!doc.password) set.password = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10)
  // Joined date = when the record was created (the ObjectId carries that time)
  if (!doc.createdAt) set.createdAt = doc._id.getTimestamp()
  if (!doc.updatedAt) set.updatedAt = new Date()
  return set
}

/** Fill in the app's fields on one user. Returns true when something was missing. */
export async function completeOAuthUser(filter: { _id: string | mongoose.Types.ObjectId } | { email: string }): Promise<boolean> {
  const query = "_id" in filter ? { _id: new mongoose.Types.ObjectId(String(filter._id)) } : { email: filter.email }
  const doc = await User.collection.findOne(query) as RawUser | null
  if (!doc) return false
  const set = await missingFields(doc)
  if (Object.keys(set).length === 0) return false
  await User.collection.updateOne({ _id: doc._id }, { $set: set })
  return true
}

let backfilled = false

/** One-time repair (per server instance) for Google users created before this fix. */
export async function backfillOAuthUsers(): Promise<void> {
  if (backfilled) return
  backfilled = true
  try {
    const docs = await User.collection
      .find({ $or: [{ createdAt: { $exists: false } }, { plan: { $exists: false } }, { password: { $exists: false } }] })
      .limit(1000)
      .toArray() as RawUser[]
    for (const doc of docs) {
      const set = await missingFields(doc)
      if (Object.keys(set).length) await User.collection.updateOne({ _id: doc._id }, { $set: set })
    }
  } catch (error) {
    backfilled = false
    console.error("Backfill of Google users failed:", error)
  }
}

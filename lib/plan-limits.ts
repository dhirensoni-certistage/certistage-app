// Server-side plan limits and validation
import User from "@/models/User"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"

export type PlanType = string

export interface PlanLimits {
  maxEvents: number
  maxCertificateTypes: number
  maxCertificates: number
  canCreateEvent: boolean
  canImportData: boolean
  canExportReport: boolean
}

// Plan limits configuration - must match frontend lib/auth.ts
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxEvents: 1,
    maxCertificateTypes: 1,
    maxCertificates: 50,
    canCreateEvent: true,
    canImportData: false,
    canExportReport: false
  },
  test: {
    maxEvents: 3,
    maxCertificateTypes: 5,
    maxCertificates: 2000,
    canCreateEvent: true,
    canImportData: true,
    canExportReport: true
  },
  professional: {
    maxEvents: 3,
    maxCertificateTypes: 5,
    maxCertificates: 2000,
    canCreateEvent: true,
    canImportData: true,
    canExportReport: true
  },
  enterprise: {
    maxEvents: 10,
    maxCertificateTypes: 100,
    maxCertificates: 25000,
    canCreateEvent: true,
    canImportData: true,
    canExportReport: true
  },
  premium: {
    maxEvents: 25,
    maxCertificateTypes: 200,
    maxCertificates: 50000,
    canCreateEvent: true,
    canImportData: true,
    canExportReport: true
  }
}

// Get user's plan limits
export async function getPlanLimits(plan: string): Promise<PlanLimits> {
  try {
    const planConfig = await getPlanConfigFromDb()
    const planMap = getPlanMap(planConfig)
    const selectedPlan = planMap[plan]
    if (selectedPlan?.limits) {
      return {
        maxEvents: selectedPlan.limits.maxEvents,
        maxCertificateTypes: selectedPlan.limits.maxCertificateTypes,
        maxCertificates: selectedPlan.limits.maxCertificates,
        canCreateEvent: selectedPlan.limits.canCreateEvent,
        canImportData: selectedPlan.limits.canImportData,
        canExportReport: selectedPlan.limits.canExportReport
      }
    }
  } catch (error) {
    // Fall back to defaults if DB is unavailable
  }

  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}

// Check if user can create more events
export async function canUserCreateEvent(userId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number
  reason?: string
}> {
  const user = await User.findById(userId)
  if (!user) {
    return { allowed: false, currentCount: 0, maxAllowed: 0, reason: "User not found" }
  }

  const limits = await getPlanLimits(user.plan)
  
  if (!limits.canCreateEvent) {
    return {
      allowed: false,
      currentCount: 0,
      maxAllowed: 0,
      reason: "Free plan doesn't include event creation. Upgrade to create events."
    }
  }

  const currentCount = await Event.countDocuments({ ownerId: userId })
  
  if (currentCount >= limits.maxEvents) {
    return {
      allowed: false,
      currentCount,
      maxAllowed: limits.maxEvents,
      reason: `Event limit reached (${currentCount}/${limits.maxEvents}). Upgrade for more events.`
    }
  }

  return { allowed: true, currentCount, maxAllowed: limits.maxEvents }
}

// Check if user can create more certificate types
export async function canUserCreateCertificateType(userId: string, eventId: string): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number
  reason?: string
}> {
  const user = await User.findById(userId)
  if (!user) {
    return { allowed: false, currentCount: 0, maxAllowed: 0, reason: "User not found" }
  }

  const limits = await getPlanLimits(user.plan)
  
  // Count certificate types across all user's events
  const userEvents = await Event.find({ ownerId: userId }).select("_id")
  const eventIds = userEvents.map(e => e._id)
  const currentCount = await CertificateType.countDocuments({ eventId: { $in: eventIds } })
  
  if (currentCount >= limits.maxCertificateTypes) {
    return {
      allowed: false,
      currentCount,
      maxAllowed: limits.maxCertificateTypes,
      reason: `Certificate type limit reached (${currentCount}/${limits.maxCertificateTypes}). Upgrade for more.`
    }
  }

  return { allowed: true, currentCount, maxAllowed: limits.maxCertificateTypes }
}

/**
 * Certificates issued are consumed quota: the count only goes up when
 * recipients are added and does not come down when they are deleted.
 * The counter belongs to a plan period, identified by plan + expiry, so a
 * renewal or a plan change starts a fresh count. Free has no expiry, so its
 * count is for the life of the account.
 */
export function usagePeriodKey(user: { plan?: string; planExpiresAt?: Date | null }): string {
  const plan = user.plan || "free"
  const expires = user.planExpiresAt ? new Date(user.planExpiresAt).toISOString() : "lifetime"
  return `${plan}:${expires}`
}

async function countCurrentRecipients(userId: string): Promise<number> {
  const userEvents = await Event.find({ ownerId: userId }).select("_id")
  return Recipient.countDocuments({ eventId: { $in: userEvents.map((e) => e._id) } })
}

/** Certificates issued in the user's current plan period, initialising the counter when needed. */
export async function getIssuedCertificates(user: any): Promise<number> {
  const key = usagePeriodKey(user)
  if (user.usage?.key === key) return user.usage.certificatesIssued || 0

  // First time for this account: start from what exists today so nobody
  // loses quota in the migration. A new period after that starts at zero.
  const issued = user.usage?.key ? 0 : await countCurrentRecipients(String(user._id))
  await User.updateOne({ _id: user._id }, { $set: { usage: { key, certificatesIssued: issued } } })
  user.usage = { key, certificatesIssued: issued }
  return issued
}

/** Record newly issued certificates against the user's current plan period. */
export async function recordCertificatesIssued(userId: string, count: number): Promise<void> {
  if (count <= 0) return
  const user = await User.findById(userId)
  if (!user) return
  await getIssuedCertificates(user)
  await User.updateOne({ _id: user._id, "usage.key": usagePeriodKey(user) }, { $inc: { "usage.certificatesIssued": count } })
}

// Check if user can add more recipients/certificates
export async function canUserAddRecipients(userId: string, countToAdd: number = 1): Promise<{
  allowed: boolean
  currentCount: number
  maxAllowed: number
  availableSlots: number
  reason?: string
}> {
  const user = await User.findById(userId)
  if (!user) {
    return { allowed: false, currentCount: 0, maxAllowed: 0, availableSlots: 0, reason: "User not found" }
  }

  const limits = await getPlanLimits(user.plan)
  const currentCount = await getIssuedCertificates(user)

  if (limits.maxCertificates === -1) {
    return { allowed: true, currentCount, maxAllowed: -1, availableSlots: -1 }
  }

  const availableSlots = limits.maxCertificates - currentCount

  if (currentCount + countToAdd > limits.maxCertificates) {
    return {
      allowed: false,
      currentCount,
      maxAllowed: limits.maxCertificates,
      availableSlots: Math.max(0, availableSlots),
      reason: `Certificate limit reached (${currentCount}/${limits.maxCertificates} issued on your plan). Upgrade for more.`
    }
  }

  return {
    allowed: true,
    currentCount,
    maxAllowed: limits.maxCertificates,
    availableSlots
  }
}

// Get user's current usage stats
export async function getUserUsageStats(userId: string): Promise<{
  plan: string
  planExpiresAt: string | null
  limits: PlanLimits
  usage: {
    events: number
    certificateTypes: number
    certificates: number
    recipients: number
  }
  remaining: {
    events: number
    certificateTypes: number
    certificates: number
  }
}> {
  const user = await User.findById(userId)
  if (!user) {
    throw new Error("User not found")
  }

  const limits = await getPlanLimits(user.plan)

  // Get all user's events
  const userEvents = await Event.find({ ownerId: userId }).select("_id")
  const eventIds = userEvents.map(e => e._id)

  // Count usage
  const eventsCount = userEvents.length
  const [certTypesCount, recipientsCount, issued] = await Promise.all([
    CertificateType.countDocuments({ eventId: { $in: eventIds } }),
    Recipient.countDocuments({ eventId: { $in: eventIds } }),
    getIssuedCertificates(user)
  ])
  const remainingFor = (limit: number, used: number) => (limit === -1 ? -1 : Math.max(0, limit - used))

  return {
    plan: user.plan,
    planExpiresAt: user.planExpiresAt ? new Date(user.planExpiresAt).toISOString() : null,
    limits,
    usage: {
      events: eventsCount,
      certificateTypes: certTypesCount,
      certificates: issued,
      recipients: recipientsCount
    },
    remaining: {
      events: remainingFor(limits.maxEvents, eventsCount),
      certificateTypes: remainingFor(limits.maxCertificateTypes, certTypesCount),
      certificates: remainingFor(limits.maxCertificates, issued)
    }
  }
}

// Verify event ownership
export async function verifyEventOwnership(eventId: string, userId: string): Promise<boolean> {
  const event = await Event.findOne({ _id: eventId, ownerId: userId })
  return !!event
}

// Check if user can use a feature
export async function canUserUseFeature(userId: string, feature: keyof PlanLimits): Promise<boolean> {
  const user = await User.findById(userId)
  if (!user) return false
  
  const limits = await getPlanLimits(user.plan)
  return !!limits[feature]
}

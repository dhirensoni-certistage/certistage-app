// Server-side plan limits and validation
import User from "@/models/User"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

export type PlanType = "free" | "professional" | "enterprise" | "premium"

export interface PlanLimits {
  maxEvents: number
  maxCertificateTypes: number
  maxCertificates: number
  canCreateEvent: boolean
  canImportData: boolean
  canExportReport: boolean
}

// Plan limits configuration - must match frontend lib/auth.ts
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxEvents: 1,
    maxCertificateTypes: 1,
    maxCertificates: 50,
    canCreateEvent: true,
    canImportData: false,
    canExportReport: false
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
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanType] || PLAN_LIMITS.free
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

  const limits = getPlanLimits(user.plan)
  
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

  const limits = getPlanLimits(user.plan)
  
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

  const limits = getPlanLimits(user.plan)
  
  // Count recipients across all user's events
  const userEvents = await Event.find({ ownerId: userId }).select("_id")
  const eventIds = userEvents.map(e => e._id)
  const currentCount = await Recipient.countDocuments({ eventId: { $in: eventIds } })
  
  const availableSlots = limits.maxCertificates - currentCount
  
  if (currentCount + countToAdd > limits.maxCertificates) {
    return {
      allowed: false,
      currentCount,
      maxAllowed: limits.maxCertificates,
      availableSlots: Math.max(0, availableSlots),
      reason: `Certificate limit reached (${currentCount}/${limits.maxCertificates}). Upgrade for more.`
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
  limits: PlanLimits
  usage: {
    events: number
    certificateTypes: number
    certificates: number
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

  const limits = getPlanLimits(user.plan)
  
  // Get all user's events
  const userEvents = await Event.find({ ownerId: userId }).select("_id")
  const eventIds = userEvents.map(e => e._id)
  
  // Count usage
  const eventsCount = userEvents.length
  const certTypesCount = await CertificateType.countDocuments({ eventId: { $in: eventIds } })
  const recipientsCount = await Recipient.countDocuments({ eventId: { $in: eventIds } })

  return {
    plan: user.plan,
    limits,
    usage: {
      events: eventsCount,
      certificateTypes: certTypesCount,
      certificates: recipientsCount
    },
    remaining: {
      events: Math.max(0, limits.maxEvents - eventsCount),
      certificateTypes: Math.max(0, limits.maxCertificateTypes - certTypesCount),
      certificates: Math.max(0, limits.maxCertificates - recipientsCount)
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
  
  const limits = getPlanLimits(user.plan)
  return !!limits[feature]
}

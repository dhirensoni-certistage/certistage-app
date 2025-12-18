// Authentication for Client Portal

export type PlanType = "free" | "professional" | "enterprise" | "premium"

export interface PlanFeatures {
  canCreateEvent: boolean
  canImportData: boolean
  canExportReport: boolean
  canDigitalSignature: boolean
  downloadLimit: number // -1 = unlimited
  maxCertificateTypes: number // -1 = unlimited
  maxCertificates: number // -1 = unlimited
  maxEvents: number // -1 = unlimited
  canUpgrade: boolean
  displayName: string
  price: string
  priceYearly: string
  color: string
}

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  "free": {
    canCreateEvent: true,
    canImportData: false,
    canExportReport: false,
    canDigitalSignature: false,
    downloadLimit: 1,
    maxCertificateTypes: 1,
    maxCertificates: 50,
    maxEvents: 1,
    canUpgrade: true,
    displayName: "Free",
    price: "₹0",
    priceYearly: "₹0",
    color: "gray"
  },
  "professional": {
    canCreateEvent: true,
    canImportData: true,
    canExportReport: true,
    canDigitalSignature: true,
    downloadLimit: -1,
    maxCertificateTypes: 5,
    maxCertificates: 2000,
    maxEvents: 3,
    canUpgrade: true,
    displayName: "Professional",
    price: "₹2,999/year",
    priceYearly: "₹2,999",
    color: "blue"
  },
  "enterprise": {
    canCreateEvent: true,
    canImportData: true,
    canExportReport: true,
    canDigitalSignature: true,
    downloadLimit: -1,
    maxCertificateTypes: 100,
    maxCertificates: 25000,
    maxEvents: 10,
    canUpgrade: true,
    displayName: "Enterprise Gold",
    price: "₹6,999/year",
    priceYearly: "₹6,999",
    color: "amber"
  },
  "premium": {
    canCreateEvent: true,
    canImportData: true,
    canExportReport: true,
    canDigitalSignature: true,
    downloadLimit: -1,
    maxCertificateTypes: 200,
    maxCertificates: 50000,
    maxEvents: 25,
    canUpgrade: false,
    displayName: "Premium Plus",
    price: "₹11,999/year",
    priceYearly: "₹11,999",
    color: "purple"
  }
}

export interface ClientSession {
  eventId?: string
  eventName?: string
  userId?: string
  userName?: string
  userEmail?: string
  userPlan?: PlanType
  loginType: "user" | "event"
  loggedInAt: string
}

export interface UserAccount {
  id: string
  name: string
  email: string
  password: string
  phone: string
  organization?: string
  plan: PlanType
  eventId?: string // Auto-created event for user
  createdAt: string
}

const CLIENT_SESSION_KEY = "clientSession"
const USERS_KEY = "certistage_users"

// ============ PLAN FUNCTIONS ============

// Get plan features for a user
export function getUserPlanFeatures(userId?: string): PlanFeatures {
  if (!userId) return PLAN_FEATURES["free"]
  
  const users = getUsers()
  const user = users.find(u => u.id === userId)
  
  if (!user || !user.plan) return PLAN_FEATURES["free"]
  
  // Handle old plan names migration
  const planMap: Record<string, PlanType> = {
    "free-trial": "free",
    "starter": "professional"
  }
  const mappedPlan = planMap[user.plan] || user.plan
  
  return PLAN_FEATURES[mappedPlan as PlanType] || PLAN_FEATURES["free"]
}

// Get current session plan features
export function getCurrentPlanFeatures(): PlanFeatures {
  const session = getClientSession()
  if (!session || session.loginType !== "user") {
    // Event login = full access (admin assigned)
    return PLAN_FEATURES["enterprise"]
  }
  return getUserPlanFeatures(session.userId)
}

// Update user plan
export function updateUserPlan(userId: string, newPlan: PlanType): boolean {
  const users = getUsers()
  const userIndex = users.findIndex(u => u.id === userId)
  
  if (userIndex === -1) return false
  
  users[userIndex].plan = newPlan
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  
  return true
}

// Update user's eventId (for existing users without event)
export function updateUserEventId(userId: string, eventId: string): boolean {
  const users = getUsers()
  const userIndex = users.findIndex(u => u.id === userId)
  
  if (userIndex === -1) return false
  
  users[userIndex].eventId = eventId
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  
  return true
}

// Get user by ID
export function getUserById(userId: string): UserAccount | null {
  const users = getUsers()
  return users.find(u => u.id === userId) || null
}

// ============ TRIAL FUNCTIONS ============

const TRIAL_DAYS = 7

// Check if user's trial has expired
export function isTrialExpired(userId?: string): boolean {
  if (!userId) return true
  
  const user = getUserById(userId)
  if (!user) return true
  
  // Only check trial for free plan
  if (user.plan !== "free") return false
  
  const createdAt = new Date(user.createdAt)
  const now = new Date()
  const diffTime = now.getTime() - createdAt.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays >= TRIAL_DAYS
}

// Get remaining trial days
export function getTrialDaysRemaining(userId?: string): number {
  if (!userId) return 0
  
  const user = getUserById(userId)
  if (!user) return 0
  
  // Only for free plan
  if (user.plan !== "free") return -1 // -1 means not on trial
  
  const createdAt = new Date(user.createdAt)
  const now = new Date()
  const diffTime = now.getTime() - createdAt.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, TRIAL_DAYS - diffDays)
}

// Get trial status
export function getTrialStatus(userId?: string): {
  isOnTrial: boolean
  isExpired: boolean
  daysRemaining: number
  totalDays: number
} {
  if (!userId) {
    return { isOnTrial: false, isExpired: true, daysRemaining: 0, totalDays: TRIAL_DAYS }
  }
  
  const user = getUserById(userId)
  if (!user || user.plan !== "free") {
    return { isOnTrial: false, isExpired: false, daysRemaining: -1, totalDays: TRIAL_DAYS }
  }
  
  const daysRemaining = getTrialDaysRemaining(userId)
  const isExpired = daysRemaining <= 0
  
  return {
    isOnTrial: true,
    isExpired,
    daysRemaining,
    totalDays: TRIAL_DAYS
  }
}

// Event credentials (in real app, this would be in database)
export interface EventCredentials {
  eventId: string
  username: string
  password: string
}

// ============ USER ACCOUNT FUNCTIONS ============

// Get all users
export function getUsers(): UserAccount[] {
  if (typeof window === "undefined") return []
  const usersStr = localStorage.getItem(USERS_KEY)
  return usersStr ? JSON.parse(usersStr) : []
}

// Create new user account
export function createUserAccount(userData: Omit<UserAccount, "id" | "createdAt"> & { eventId?: string }): UserAccount {
  const users = getUsers()
  
  const newUser: UserAccount = {
    ...userData,
    id: `user_${Date.now()}`,
    createdAt: new Date().toISOString()
  }
  
  users.push(newUser)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  
  return newUser
}

// Check if email already exists
export function emailExists(email: string): boolean {
  const users = getUsers()
  return users.some(u => u.email.toLowerCase() === email.toLowerCase())
}

// Generate random password
export function generatePassword(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Verify user login (email + password)
export function verifyUserLogin(email: string, password: string): { success: boolean; user?: UserAccount } {
  const users = getUsers()
  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password.trim()
  )
  
  if (user) {
    return { success: true, user }
  }
  return { success: false }
}

// ============ EVENT CREDENTIALS FUNCTIONS ============

// Get event credentials
export function getEventCredentials(eventId: string): EventCredentials | null {
  if (typeof window === "undefined") return null
  const credsStr = localStorage.getItem(`event_creds_${eventId}`)
  return credsStr ? JSON.parse(credsStr) : null
}

// Set event credentials
export function setEventCredentials(eventId: string, username: string, password: string): void {
  const creds: EventCredentials = { eventId, username, password }
  localStorage.setItem(`event_creds_${eventId}`, JSON.stringify(creds))
}

// Verify event credentials login
export function verifyEventLogin(username: string, password: string): { success: boolean; eventId?: string; eventName?: string } {
  if (typeof window === "undefined") return { success: false }
  
  const eventsStr = localStorage.getItem("certificateEvents")
  if (!eventsStr) return { success: false }
  
  const events = JSON.parse(eventsStr)
  
  for (const event of events) {
    const creds = getEventCredentials(event.id)
    if (creds) {
      if (creds.username.trim() === username.trim() && creds.password.trim() === password.trim()) {
        return { success: true, eventId: event.id, eventName: event.name }
      }
    }
  }
  
  return { success: false }
}

// ============ COMBINED LOGIN ============

// Verify client login - tries user account first, then event credentials
export function verifyClientLogin(emailOrUsername: string, password: string): { 
  success: boolean
  loginType?: "user" | "event"
  user?: UserAccount
  eventId?: string
  eventName?: string 
} {
  // First try user account login (email)
  const userResult = verifyUserLogin(emailOrUsername, password)
  if (userResult.success && userResult.user) {
    return { 
      success: true, 
      loginType: "user",
      user: userResult.user
    }
  }
  
  // Then try event credentials login
  const eventResult = verifyEventLogin(emailOrUsername, password)
  if (eventResult.success) {
    return { 
      success: true, 
      loginType: "event",
      eventId: eventResult.eventId,
      eventName: eventResult.eventName
    }
  }
  
  return { success: false }
}

// Create client session - supports both user and event login
export function createClientSession(data: {
  loginType: "user" | "event"
  user?: UserAccount
  eventId?: string
  eventName?: string
}): void {
  const session: ClientSession = {
    loginType: data.loginType,
    loggedInAt: new Date().toISOString()
  }
  
  if (data.loginType === "user" && data.user) {
    session.userId = data.user.id
    session.userName = data.user.name
    session.userEmail = data.user.email
    session.userPlan = data.user.plan
    // Include user's auto-created event
    if (data.user.eventId) {
      session.eventId = data.user.eventId
    }
  } else if (data.loginType === "event") {
    session.eventId = data.eventId
    session.eventName = data.eventName
  }
  
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session))
}

// Get client session
export function getClientSession(): ClientSession | null {
  if (typeof window === "undefined") return null
  const sessionStr = localStorage.getItem(CLIENT_SESSION_KEY)
  return sessionStr ? JSON.parse(sessionStr) : null
}

// Clear client session
export function clearClientSession(): void {
  localStorage.removeItem(CLIENT_SESSION_KEY)
}

// Update session's active event
export function updateSessionEvent(eventId: string, eventName: string): void {
  const session = getClientSession()
  if (!session) return
  
  session.eventId = eventId
  session.eventName = eventName
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session))
}

// Clear session's active event (go back to event list)
export function clearSessionEvent(): void {
  const session = getClientSession()
  if (!session || session.loginType !== "user") return
  
  delete session.eventId
  delete session.eventName
  localStorage.setItem(CLIENT_SESSION_KEY, JSON.stringify(session))
}

// Check if client is logged in
export function isClientLoggedIn(): boolean {
  return getClientSession() !== null
}


// Get download limit for an event (based on owner's plan)
export function getEventDownloadLimit(eventOwnerId?: string): number {
  if (!eventOwnerId) return -1 // No owner = unlimited (admin created)
  
  const owner = getUserById(eventOwnerId)
  if (!owner) return -1
  
  const planFeatures = PLAN_FEATURES[owner.plan]
  return planFeatures.downloadLimit
}

// Event/Batch management for certificates

export interface TextField {
  id: string
  variable: string // e.g., "NAME", "EMAIL", "REG_NO"
  position: { x: number; y: number }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
}

export interface SignatureField {
  id: string
  image: string // Base64 image
  position: { x: number; y: number }
  width: number // percentage of template width
}

export interface CertificateType {
  id: string
  name: string // e.g., "Participation", "Winner", "Appreciation"
  template?: string // Base64 image
  textPosition: {
    x: number
    y: number
  }
  fontSize: number // in pixels (default 24)
  fontFamily: string // font family name
  fontBold: boolean
  fontItalic: boolean
  showNameField?: boolean // whether to show the NAME field (default true)
  customFields?: TextField[] // custom variables
  signatures?: SignatureField[] // digital signatures
  recipients: EventRecipient[]
  stats: {
    total: number
    downloaded: number
    pending: number
  }
  shortCode?: string
  createdAt: string
}

export interface CertificateEvent {
  id: string
  name: string
  description?: string
  ownerId?: string // User ID who owns this event
  createdAt: string
  // Multiple certificate types within one event
  certificateTypes: CertificateType[]
  // Overall stats
  stats: {
    total: number
    downloaded: number
    pending: number
    certificateTypesCount: number
  }
}

export interface EventRecipient {
  id: string
  prefix?: string // e.g., "Dr.", "Mr.", "Ms."
  firstName?: string
  lastName?: string
  name: string // Full name (prefix + firstName + lastName)
  email: string
  mobile: string
  certificateId: string
  regNo?: string // Alias for certificateId
  status: "pending" | "downloaded"
  downloadedAt?: string
  downloadCount: number
}

const EVENTS_KEY = "certificateEvents"

// Get all events
export function getEvents(): CertificateEvent[] {
  if (typeof window === "undefined") return []
  const eventsStr = localStorage.getItem(EVENTS_KEY)
  if (!eventsStr) return []

  // Migrate old events to new format
  const events = JSON.parse(eventsStr)
  return events.map(migrateEvent)
}

// Migrate old event format to new format
function migrateEvent(event: any): CertificateEvent {
  // If already has certificateTypes, migrate each type
  if (event.certificateTypes) {
    // Add new fields to existing certificate types if missing
    event.certificateTypes = event.certificateTypes.map((ct: any) => ({
      ...ct,
      fontSize: ct.fontSize ?? 24,
      fontFamily: ct.fontFamily ?? "Arial",
      fontBold: ct.fontBold ?? false,
      fontItalic: ct.fontItalic ?? false,
    }))
    return event
  }

  // Migrate old format
  const certificateTypes: CertificateType[] = []

  // If old event had template/recipients, create a default certificate type
  if (event.template || (event.recipients && event.recipients.length > 0)) {
    certificateTypes.push({
      id: generateCertTypeId(),
      name: "Default Certificate",
      template: event.template,
      textPosition: event.textPosition || { x: 50, y: 60 },
      fontSize: 24,
      fontFamily: "Arial",
      fontBold: false,
      fontItalic: false,
      recipients: event.recipients || [],
      stats: event.stats || { total: 0, downloaded: 0, pending: 0 },
      createdAt: event.createdAt
    })
  }

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    createdAt: event.createdAt,
    certificateTypes,
    stats: calculateEventStats(certificateTypes)
  }
}

// Get single event
export function getEvent(eventId: string): CertificateEvent | null {
  const events = getEvents()
  return events.find((e) => e.id === eventId) || null
}

// Create new event (Host only creates event, no template/recipients)
export function createEvent(name: string, description?: string, ownerId?: string): CertificateEvent {
  const events = getEvents()
  const newEvent: CertificateEvent = {
    id: generateEventId(),
    name,
    description,
    ownerId,
    createdAt: new Date().toISOString(),
    certificateTypes: [],
    stats: { total: 0, downloaded: 0, pending: 0, certificateTypesCount: 0 }
  }
  events.push(newEvent)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return newEvent
}

// Update event basic info
export function updateEvent(
  eventId: string,
  updates: Partial<Pick<CertificateEvent, 'name' | 'description'>>
): CertificateEvent | null {
  const events = getEvents()
  const index = events.findIndex((e) => e.id === eventId)
  if (index === -1) return null

  events[index] = { ...events[index], ...updates }
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return events[index]
}

// Delete event
export function deleteEvent(eventId: string): boolean {
  const events = getEvents()
  const filtered = events.filter((e) => e.id !== eventId)
  if (filtered.length === events.length) return false
  localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered))
  return true
}

// Set event owner (for migration of existing events)
export function setEventOwner(eventId: string, ownerId: string): boolean {
  const events = getEvents()
  const index = events.findIndex((e) => e.id === eventId)
  if (index === -1) return false

  events[index].ownerId = ownerId
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return true
}

// ============ Certificate Type Functions (Client uses these) ============

// Add certificate type to event
export function addCertificateType(eventId: string, name: string): CertificateType | null {
  const events = getEvents()
  const index = events.findIndex((e) => e.id === eventId)
  if (index === -1) return null

  const newType: CertificateType = {
    id: generateCertTypeId(),
    name,
    textPosition: { x: 50, y: 60 },
    fontSize: 24,
    fontFamily: "Arial",
    fontBold: false,
    fontItalic: false,
    recipients: [],
    stats: { total: 0, downloaded: 0, pending: 0 },
    createdAt: new Date().toISOString()
  }

  events[index].certificateTypes.push(newType)
  events[index].stats = calculateEventStats(events[index].certificateTypes)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return newType
}

// Get certificate type
export function getCertificateType(eventId: string, typeId: string): CertificateType | null {
  const event = getEvent(eventId)
  if (!event) return null
  return event.certificateTypes.find(t => t.id === typeId) || null
}

// Update certificate type
export function updateCertificateType(
  eventId: string,
  typeId: string,
  updates: Partial<Omit<CertificateType, 'id' | 'createdAt'>>
): CertificateType | null {
  const events = getEvents()
  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return null

  const typeIndex = events[eventIndex].certificateTypes.findIndex(t => t.id === typeId)
  if (typeIndex === -1) return null

  events[eventIndex].certificateTypes[typeIndex] = {
    ...events[eventIndex].certificateTypes[typeIndex],
    ...updates
  }
  events[eventIndex].stats = calculateEventStats(events[eventIndex].certificateTypes)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return events[eventIndex].certificateTypes[typeIndex]
}

// Delete certificate type
export function deleteCertificateType(eventId: string, typeId: string): boolean {
  const events = getEvents()
  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return false

  events[eventIndex].certificateTypes = events[eventIndex].certificateTypes.filter(t => t.id !== typeId)
  events[eventIndex].stats = calculateEventStats(events[eventIndex].certificateTypes)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return true
}

// Add recipients to certificate type
export function addRecipientsToCertType(
  eventId: string,
  typeId: string,
  recipients: Array<{
    prefix?: string
    firstName?: string
    lastName?: string
    name?: string
    email?: string
    mobile?: string
    certificateId?: string
    registrationNo?: string
    regNo?: string
  }>
): CertificateType | null {
  const events = getEvents()
  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return null

  const typeIndex = events[eventIndex].certificateTypes.findIndex(t => t.id === typeId)
  if (typeIndex === -1) return null

  const newRecipients: EventRecipient[] = recipients.map((r) => {
    // Build full name from prefix + firstName + lastName
    const prefix = (r.prefix || "").trim()
    const firstName = (r.firstName || "").trim()
    const lastName = (r.lastName || "").trim()
    const fullName = r.name || [prefix, firstName, lastName].filter(Boolean).join(" ")
    const certId = r.certificateId || r.registrationNo || r.regNo || generateRecipientId()
    
    return {
      id: generateRecipientId(),
      prefix,
      firstName,
      lastName,
      name: fullName,
      email: r.email || "",
      mobile: r.mobile || "",
      certificateId: certId,
      regNo: certId,
      status: "pending" as const,
      downloadCount: 0,
    }
  })

  events[eventIndex].certificateTypes[typeIndex].recipients.push(...newRecipients)
  events[eventIndex].certificateTypes[typeIndex].stats = calculateTypeStats(
    events[eventIndex].certificateTypes[typeIndex].recipients
  )
  events[eventIndex].stats = calculateEventStats(events[eventIndex].certificateTypes)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return events[eventIndex].certificateTypes[typeIndex]
}

// Clear recipients from certificate type
export function clearCertTypeRecipients(eventId: string, typeId: string): boolean {
  const events = getEvents()
  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return false

  const typeIndex = events[eventIndex].certificateTypes.findIndex(t => t.id === typeId)
  if (typeIndex === -1) return false

  events[eventIndex].certificateTypes[typeIndex].recipients = []
  events[eventIndex].certificateTypes[typeIndex].stats = { total: 0, downloaded: 0, pending: 0 }
  events[eventIndex].stats = calculateEventStats(events[eventIndex].certificateTypes)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return true
}

// Delete single recipient from certificate type
export function deleteRecipient(eventId: string, typeId: string, recipientId: string): boolean {
  const events = getEvents()
  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return false

  const typeIndex = events[eventIndex].certificateTypes.findIndex(t => t.id === typeId)
  if (typeIndex === -1) return false

  const recipientIndex = events[eventIndex].certificateTypes[typeIndex].recipients.findIndex(
    r => r.id === recipientId
  )
  if (recipientIndex === -1) return false

  events[eventIndex].certificateTypes[typeIndex].recipients.splice(recipientIndex, 1)
  events[eventIndex].certificateTypes[typeIndex].stats = calculateTypeStats(
    events[eventIndex].certificateTypes[typeIndex].recipients
  )
  events[eventIndex].stats = calculateEventStats(events[eventIndex].certificateTypes)
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return true
}

// Update single recipient in certificate type
export function updateRecipient(
  eventId: string,
  typeId: string,
  recipientId: string,
  updates: {
    prefix?: string
    firstName?: string
    lastName?: string
    email?: string
    mobile?: string
    regNo?: string
  }
): EventRecipient | null {
  const events = getEvents()
  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return null

  const typeIndex = events[eventIndex].certificateTypes.findIndex(t => t.id === typeId)
  if (typeIndex === -1) return null

  const recipientIndex = events[eventIndex].certificateTypes[typeIndex].recipients.findIndex(
    r => r.id === recipientId
  )
  if (recipientIndex === -1) return null

  const recipient = events[eventIndex].certificateTypes[typeIndex].recipients[recipientIndex]
  
  // Update fields
  const prefix = updates.prefix !== undefined ? updates.prefix.trim() : recipient.prefix
  const firstName = updates.firstName !== undefined ? updates.firstName.trim() : recipient.firstName
  const lastName = updates.lastName !== undefined ? updates.lastName.trim() : recipient.lastName
  const fullName = [prefix, firstName, lastName].filter(Boolean).join(" ")
  
  events[eventIndex].certificateTypes[typeIndex].recipients[recipientIndex] = {
    ...recipient,
    prefix,
    firstName,
    lastName,
    name: fullName,
    email: updates.email !== undefined ? updates.email.trim() : recipient.email,
    mobile: updates.mobile !== undefined ? updates.mobile.trim() : recipient.mobile,
    regNo: updates.regNo !== undefined ? updates.regNo.trim() : recipient.regNo,
    certificateId: updates.regNo !== undefined ? updates.regNo.trim() : recipient.certificateId,
  }

  localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  return events[eventIndex].certificateTypes[typeIndex].recipients[recipientIndex]
}

// Get recipient by certificate ID
export function getRecipientByCertificateId(
  eventId: string,
  certificateId: string
): { recipient: EventRecipient; certType: CertificateType } | null {
  const event = getEvent(eventId)
  if (!event) return null

  for (const certType of event.certificateTypes) {
    const recipient = certType.recipients.find(r => r.certificateId === certificateId)
    if (recipient) {
      return { recipient, certType }
    }
  }
  return null
}

// Mark certificate as downloaded
export function markAsDownloaded(eventId: string, certificateId: string): boolean {
  const events = getEvents()
  const eventIndex = events.findIndex((e) => e.id === eventId)
  if (eventIndex === -1) return false

  for (let i = 0; i < events[eventIndex].certificateTypes.length; i++) {
    const recipientIndex = events[eventIndex].certificateTypes[i].recipients.findIndex(
      (r) => r.certificateId === certificateId
    )
    if (recipientIndex !== -1) {
      events[eventIndex].certificateTypes[i].recipients[recipientIndex].status = "downloaded"
      events[eventIndex].certificateTypes[i].recipients[recipientIndex].downloadedAt = new Date().toISOString()
      events[eventIndex].certificateTypes[i].recipients[recipientIndex].downloadCount += 1
      events[eventIndex].certificateTypes[i].stats = calculateTypeStats(
        events[eventIndex].certificateTypes[i].recipients
      )
      events[eventIndex].stats = calculateEventStats(events[eventIndex].certificateTypes)
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
      return true
    }
  }
  return false
}

// Find recipients by email or mobile across all certificate types
export function findRecipientsByContact(
  eventId: string,
  contact: string
): { recipient: EventRecipient; certType: CertificateType }[] {
  const event = getEvent(eventId)
  if (!event) return []

  const searchLower = contact.toLowerCase().trim()
  const searchDigits = contact.replace(/[^0-9]/g, "")
  const results: { recipient: EventRecipient; certType: CertificateType }[] = []

  for (const certType of event.certificateTypes) {
    for (const recipient of certType.recipients) {
      if (
        recipient.email.toLowerCase() === searchLower ||
        recipient.mobile.replace(/[^0-9]/g, "").includes(searchDigits) ||
        recipient.mobile === contact
      ) {
        results.push({ recipient, certType })
      }
    }
  }

  return results
}

// Calculate stats for a certificate type
function calculateTypeStats(recipients: EventRecipient[]) {
  return {
    total: recipients.length,
    downloaded: recipients.filter((r) => r.status === "downloaded").length,
    pending: recipients.filter((r) => r.status === "pending").length,
  }
}

// Calculate overall event stats
function calculateEventStats(certificateTypes: CertificateType[]) {
  let total = 0, downloaded = 0, pending = 0
  for (const type of certificateTypes) {
    total += type.stats.total
    downloaded += type.stats.downloaded
    pending += type.stats.pending
  }
  return { total, downloaded, pending, certificateTypesCount: certificateTypes.length }
}

// Generate unique IDs
function generateEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`
}

function generateCertTypeId(): string {
  return `ctype_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`
}

function generateRecipientId(): string {
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`
}

// Generate public download link (individual certificate)
export function getDownloadLink(eventId: string, certificateId: string): string {
  return `/download?event=${eventId}&cert=${certificateId}`
}

// Generate public event link (all certificate types)
export function getEventPublicLink(eventId: string): string {
  return `/download/${eventId}`
}

// Generate public link for specific certificate type
export function getCertTypePublicLink(eventId: string, typeId: string): string {
  return `/download/${eventId}/${typeId}`
}

// Get all events for a specific user
export function getUserEvents(userId: string): CertificateEvent[] {
  const events = getEvents()
  return events.filter(e => e.ownerId === userId)
}

// Get user's event count
export function getUserEventCount(userId: string): number {
  return getUserEvents(userId).length
}

// Check if user can create more events based on plan limits
export function canUserCreateEvent(userId: string): {
  canCreate: boolean
  currentCount: number
  maxEvents: number
  reason?: string
} {
  // Import plan features dynamically to avoid circular dependency
  const { getUserPlanFeatures } = require("./auth")

  const currentCount = getUserEventCount(userId)
  const planFeatures = getUserPlanFeatures(userId)
  const maxEvents = planFeatures.maxEvents

  // -1 means unlimited (Premium Plus)
  if (maxEvents === -1) {
    return {
      canCreate: true,
      currentCount,
      maxEvents: -1
    }
  }

  // Check if user has reached limit
  if (currentCount >= maxEvents) {
    return {
      canCreate: false,
      currentCount,
      maxEvents,
      reason: maxEvents === 0
        ? "Free plan doesn't include event creation. Upgrade to create events."
        : `You've reached your plan's event limit (${currentCount}/${maxEvents}). Upgrade for more events.`
    }
  }

  return {
    canCreate: true,
    currentCount,
    maxEvents
  }
}

// Create event for user with plan validation
export function createEventForUser(
  userId: string,
  name: string,
  description?: string
): CertificateEvent | { error: string } {
  const canCreate = canUserCreateEvent(userId)

  if (!canCreate.canCreate) {
    return { error: canCreate.reason || "Cannot create event" }
  }

  // Create event with owner
  return createEvent(name, description, userId)
}

// Legacy functions for backward compatibility
export function setCurrentEvent(eventId: string): void {
  localStorage.setItem("currentEventId", eventId)
}

export function getCurrentEventId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("currentEventId")
}

export interface PlanLimitsConfig {
  maxEvents: number
  maxCertificateTypes: number
  maxCertificates: number
  canCreateEvent: boolean
  canImportData: boolean
  canExportReport: boolean
  downloadLimit: number
  canUpgrade: boolean
  /** May switch off "Powered by CertiStage" on download pages (Settings) */
  canRemoveBranding: boolean
}

export interface PlanConfig {
  id: string
  enabled: boolean
  name: string
  price: number // in paise
  currency?: string
  /** "year", "month" or "one-time" (paid once, e.g. the one-event plan) */
  billingPeriod?: string
  /** How long the plan stays active after payment. Defaults from billingPeriod: 365, 30 or 60 days. */
  validityDays?: number
  badge?: string
  highlight?: boolean
  accent?: string
  sortOrder?: number
  description?: string
  features: string[]
  limits: PlanLimitsConfig
}

const DEFAULT_LIMITS: PlanLimitsConfig = {
  maxEvents: 0,
  maxCertificateTypes: 0,
  maxCertificates: 0,
  canCreateEvent: false,
  canImportData: false,
  canExportReport: false,
  downloadLimit: 0,
  canUpgrade: true,
  canRemoveBranding: false
}

export const DEFAULT_PLAN_CONFIG: PlanConfig[] = [
  {
    id: "free",
    enabled: true,
    name: "Free",
    price: 0,
    currency: "INR",
    billingPeriod: "year",
    sortOrder: 1,
    description: "Trial - 50 certificates",
    features: [
      "Up to 1 event",
      "Up to 50 certificates",
      "Basic templates"
    ],
    limits: {
      maxEvents: 1,
      maxCertificateTypes: 1,
      maxCertificates: 50,
      canCreateEvent: true,
      canImportData: false,
      canExportReport: false,
      downloadLimit: 1,
      canUpgrade: true,
      canRemoveBranding: false
    }
  },
  {
    // Paid once by UPI for a single conference, fest or workshop. Familiar per-event pricing
    // (Zoho Backstage, KonfHub) for buyers who will not commit to a year. 6.3 of these equal
    // the annual price, so repeat buyers are nudged to Professional on the Plans page.
    id: "event",
    enabled: true,
    name: "One event",
    price: 79900,
    currency: "INR",
    billingPeriod: "one-time",
    validityDays: 60,
    badge: "Pay once",
    sortOrder: 2,
    description: "One event, paid once. Organiser access for 60 days.",
    features: [
      "1 event, up to 1,000 certificates",
      "Up to 3 certificate designs",
      "Excel import and reports",
      "Organiser access for 60 days",
      "No renewal, no card needed"
    ],
    limits: {
      maxEvents: 1,
      maxCertificateTypes: 3,
      maxCertificates: 1000,
      canCreateEvent: true,
      canImportData: true,
      canExportReport: true,
      downloadLimit: -1,
      canUpgrade: true,
      canRemoveBranding: false
    }
  },
  {
    id: "test",
    enabled: false,
    name: "Test",
    price: 100,
    currency: "INR",
    billingPeriod: "year",
    badge: "Test",
    sortOrder: 6,
    description: "Test payments only",
    features: [
      "Test payments only",
      "Instant activation",
      "Safe to delete later"
    ],
    limits: {
      maxEvents: 3,
      maxCertificateTypes: 5,
      maxCertificates: 2000,
      canCreateEvent: true,
      canImportData: true,
      canExportReport: true,
      downloadLimit: -1,
      canUpgrade: true,
      canRemoveBranding: true
    }
  },
  {
    id: "professional",
    enabled: true,
    name: "Professional",
    price: 499900,
    currency: "INR",
    billingPeriod: "year",
    badge: "Most Popular",
    highlight: true,
    sortOrder: 3,
    description: "Perfect for single large events.",
    features: [
      "Up to 2,000 certificates/year",
      "Up to 5 certificate types",
      "Basic analytics & export",
      "Priority email support",
      "Excel data import"
    ],
    limits: {
      maxEvents: 3,
      maxCertificateTypes: 5,
      maxCertificates: 2000,
      canCreateEvent: true,
      canImportData: true,
      canExportReport: true,
      downloadLimit: -1,
      canUpgrade: true,
      canRemoveBranding: true
    }
  },
  {
    id: "enterprise",
    enabled: true,
    name: "Enterprise",
    price: 999900,
    currency: "INR",
    billingPeriod: "year",
    badge: "Best Value",
    sortOrder: 4,
    description: "Ideal for recurring monthly events.",
    features: [
      "Up to 25,000 certificates/year",
      "Up to 100 certificate types",
      "Bulk import & processing",
      "Advanced report filtering",
      "Dedicated account manager",
      "Everything in Professional"
    ],
    limits: {
      maxEvents: 10,
      maxCertificateTypes: 100,
      maxCertificates: 25000,
      canCreateEvent: true,
      canImportData: true,
      canExportReport: true,
      downloadLimit: -1,
      canUpgrade: true,
      canRemoveBranding: true
    }
  },
  {
    id: "premium",
    enabled: true,
    name: "Premium",
    price: 1999900,
    currency: "INR",
    billingPeriod: "year",
    sortOrder: 5,
    description: "Unlimited power for large organizations.",
    features: [
      "Up to 50,000 certificates/year",
      "Unlimited certificate types",
      "Full Whitelabel branding",
      "Custom design assistance",
      "API & Webhook access",
      "Everything in Enterprise"
    ],
    limits: {
      maxEvents: 25,
      maxCertificateTypes: 200,
      maxCertificates: 50000,
      canCreateEvent: true,
      canImportData: true,
      canExportReport: true,
      downloadLimit: -1,
      canUpgrade: false,
      canRemoveBranding: true
    }
  }
]

export function getDefaultPlanConfig(): PlanConfig[] {
  return JSON.parse(JSON.stringify(DEFAULT_PLAN_CONFIG)) as PlanConfig[]
}

function normalizePlan(plan: any, fallback?: PlanConfig): PlanConfig {
  const base: PlanConfig = fallback || {
    id: typeof plan?.id === "string" ? plan.id : "custom",
    enabled: true,
    name: typeof plan?.name === "string" ? plan.name : "Custom Plan",
    price: 0,
    currency: "INR",
    billingPeriod: "year",
    description: "",
    features: [],
    limits: { ...DEFAULT_LIMITS }
  }

  const limits = plan?.limits || {}
  const parseNumber = (value: any, fallbackValue: number) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallbackValue
  }

  return {
    ...base,
    id: typeof plan?.id === "string" ? plan.id : base.id,
    enabled: typeof plan?.enabled === "boolean" ? plan.enabled : base.enabled,
    name: typeof plan?.name === "string" ? plan.name : base.name,
    price: typeof plan?.price === "number" ? plan.price : base.price,
    currency: typeof plan?.currency === "string" ? plan.currency : base.currency,
    billingPeriod: typeof plan?.billingPeriod === "string" ? plan.billingPeriod : base.billingPeriod,
    validityDays: Number.isFinite(Number(plan?.validityDays)) && Number(plan.validityDays) > 0 ? Number(plan.validityDays) : base.validityDays,
    badge: typeof plan?.badge === "string" ? plan.badge : base.badge,
    highlight: typeof plan?.highlight === "boolean" ? plan.highlight : base.highlight,
    accent: typeof plan?.accent === "string" ? plan.accent : base.accent,
    sortOrder: typeof plan?.sortOrder === "number" ? plan.sortOrder : base.sortOrder,
    description: typeof plan?.description === "string" ? plan.description : base.description,
    features: Array.isArray(plan?.features) ? plan.features : base.features,
    limits: {
      maxEvents: parseNumber(limits.maxEvents, base.limits.maxEvents),
      maxCertificateTypes: parseNumber(limits.maxCertificateTypes, base.limits.maxCertificateTypes),
      maxCertificates: parseNumber(limits.maxCertificates, base.limits.maxCertificates),
      canCreateEvent: typeof limits.canCreateEvent === "boolean" ? limits.canCreateEvent : base.limits.canCreateEvent,
      canImportData: typeof limits.canImportData === "boolean" ? limits.canImportData : base.limits.canImportData,
      canExportReport: typeof limits.canExportReport === "boolean" ? limits.canExportReport : base.limits.canExportReport,
      downloadLimit: parseNumber(limits.downloadLimit, base.limits.downloadLimit),
      canUpgrade: typeof limits.canUpgrade === "boolean" ? limits.canUpgrade : base.limits.canUpgrade,
      canRemoveBranding: typeof limits.canRemoveBranding === "boolean" ? limits.canRemoveBranding : base.limits.canRemoveBranding
    }
  }
}

export function mergePlanConfigWithDefaults(value: unknown): PlanConfig[] {
  const defaults = getDefaultPlanConfig()
  const input = Array.isArray(value) ? value : []

  if (input.length === 0) {
    return defaults
  }

  const defaultsMap = new Map(defaults.map((plan) => [plan.id, plan]))
  const overrides = new Map<string, any>()

  for (const item of input) {
    if (item?.id) overrides.set(item.id, item)
  }

  const normalized = Array.from(overrides.values()).map((item) =>
    normalizePlan(item, defaultsMap.get(item.id))
  )

  // A saved config predates plans added to the defaults later (e.g. the one-event plan),
  // so any default plan it does not mention is added with its default settings. To take
  // one off sale, disable it in Admin > Plans rather than deleting it.
  for (const plan of defaults) {
    if (!normalized.some((p) => p.id === plan.id)) normalized.push(plan)
  }

  return normalized.sort((a, b) => {
    const orderA = a.sortOrder ?? 999
    const orderB = b.sortOrder ?? 999
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}

export function formatRupees(amountInPaise: number): string {
  return `INR ${(amountInPaise / 100).toLocaleString("en-IN")}`
}

// "₹4,999" style label for UI copy (formatRupees uses the "INR" prefix)
export function formatInr(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString("en-IN")}`
}

// Cheapest enabled paid plan, used for "Starting from ..." copy. Null when no paid plan is on sale.
export function getStartingPaidPlan(plans: PlanConfig[]): PlanConfig | null {
  const paid = plans.filter((plan) => plan.enabled !== false && plan.price > 0)
  if (paid.length === 0) return null
  return paid.reduce((cheapest, plan) => (plan.price < cheapest.price ? plan : cheapest))
}

export function toPriceLabel(amountInPaise: number, suffix: string = "/year"): string {
  if (amountInPaise <= 0) return formatRupees(0)
  return `${formatRupees(amountInPaise)}${suffix}`
}



// ---- Plan term helpers -------------------------------------------------------------------
// A plan's billingPeriod decides how long a payment keeps it active and how its price is
// labelled. "one-time" plans (the one-event plan) are paid once and run for validityDays.

type PlanTerm = Pick<PlanConfig, "billingPeriod" | "validityDays"> | null | undefined

export function isOneTimePlan(plan: PlanTerm): boolean {
  return (plan?.billingPeriod || "year") === "one-time"
}

/** Days a payment keeps the plan active */
export function planValidityDays(plan: PlanTerm): number {
  if (plan?.validityDays && plan.validityDays > 0) return plan.validityDays
  switch (plan?.billingPeriod || "year") {
    case "month": return 30
    case "one-time": return 60
    default: return 365
  }
}

export function planExpiryFrom(plan: PlanTerm, from: Date = new Date()): Date {
  return new Date(from.getTime() + planValidityDays(plan) * 24 * 60 * 60 * 1000)
}

/** "1 year", "30 days", "60 days": the term shown on receipts and checkout */
export function planTermLabel(plan: PlanTerm): string {
  const days = planValidityDays(plan)
  if (days === 365) return "1 year"
  if (days === 30 && (plan?.billingPeriod || "year") === "month") return "1 month"
  return `${days} days`
}

/** What follows the price: "/ year", "/ month" or "once". `short` gives "/yr", "/mo", "once". */
export function planPeriodLabel(plan: PlanTerm, short = false): string {
  switch (plan?.billingPeriod || "year") {
    case "one-time": return "once"
    case "month": return short ? "/mo" : "/ month"
    default: return short ? "/yr" : "/ year"
  }
}

/** "₹799 once", "₹4,999/yr" */
export function planPriceLabel(plan: Pick<PlanConfig, "price" | "billingPeriod" | "validityDays">, short = true): string {
  if (plan.price <= 0) return formatInr(0)
  const period = planPeriodLabel(plan, short)
  return `${formatInr(plan.price)}${period === "once" ? " once" : period}`
}

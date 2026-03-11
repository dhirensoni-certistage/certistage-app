export interface PlanLimitsConfig {
  maxEvents: number
  maxCertificateTypes: number
  maxCertificates: number
  canCreateEvent: boolean
  canImportData: boolean
  canExportReport: boolean
  downloadLimit: number
  canUpgrade: boolean
}

export interface PlanConfig {
  id: string
  enabled: boolean
  name: string
  price: number // in paise
  currency?: string
  billingPeriod?: string
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
  canUpgrade: true
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
      canUpgrade: true
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
    sortOrder: 2,
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
      canUpgrade: true
    }
  },
  {
    id: "professional",
    enabled: true,
    name: "Professional",
    price: 299900,
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
      canUpgrade: true
    }
  },
  {
    id: "enterprise",
    enabled: true,
    name: "Enterprise",
    price: 699900,
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
      canUpgrade: true
    }
  },
  {
    id: "premium",
    enabled: true,
    name: "Premium",
    price: 1199900,
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
      canUpgrade: false
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
      canUpgrade: typeof limits.canUpgrade === "boolean" ? limits.canUpgrade : base.limits.canUpgrade
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

  if (!normalized.some((plan) => plan.id === "free") && defaultsMap.get("free")) {
    normalized.push(normalizePlan(defaultsMap.get("free"), defaultsMap.get("free")))
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

export function toPriceLabel(amountInPaise: number, suffix: string = "/year"): string {
  if (amountInPaise <= 0) return formatRupees(0)
  return `${formatRupees(amountInPaise)}${suffix}`
}



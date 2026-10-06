export interface AdminEvent {
  _id: string
  name: string
  description?: string
  owner: { _id?: string; name?: string; email?: string } | null
  certificateTypesCount: number
  recipientsCount: number
  isActive: boolean
  createdAt: string
}

export type EventSort = "name" | "owner.name" | "certificateTypesCount" | "recipientsCount" | "isActive" | "createdAt"

export interface EventMetric {
  value: number
  recentCount: number
  change: number | null
  growth: { date: string; count: number }[]
}

export interface EventsStats {
  totalEvents: EventMetric
  totalRegistrations: EventMetric
  certificatesIssued: EventMetric
  activeEvents: EventMetric
}

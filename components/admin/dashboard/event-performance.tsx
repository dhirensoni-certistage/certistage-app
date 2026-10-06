"use client"

import Link from "next/link"
import { ArrowRight, CalendarDays } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardCard } from "@/components/admin/dashboard/dashboard-card"
import { cn } from "@/lib/utils"

export interface TopEvent {
  eventId: string
  name: string
  createdAt: string | null
  issued: number
  downloaded: number
  downloadRate: number
}

interface EventPerformanceProps {
  events: TopEvent[]
  loading?: boolean
}

const ICON_TONES = [
  "bg-blue-50 text-blue-600",
  "bg-gold-soft text-gold-deep",
  "bg-purple-50 text-purple-600",
  "bg-neutral-100 text-neutral-600",
  "bg-emerald-50 text-emerald-600",
]

export function EventPerformance({ events, loading }: EventPerformanceProps) {
  return (
    <DashboardCard
      title="Event Performance"
      description="Top events by certificates issued"
      contentClassName="px-0"
      action={
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-neutral-200 bg-white text-[12.5px] font-medium text-neutral-800 hover:bg-neutral-50 transition-colors"
        >
          View all events
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              <th className="text-left font-medium px-5 py-2.5">Event</th>
              <th className="text-left font-medium px-3 py-2.5">Issued</th>
              <th className="text-left font-medium px-3 py-2.5">Downloaded</th>
              <th className="text-left font-medium px-5 py-2.5 w-[28%]">Download rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3" colSpan={4}><Skeleton className="h-9 w-full" /></td>
                </tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-neutral-500">No certificates issued yet</td>
              </tr>
            ) : (
              events.map((event, index) => (
                <tr key={event.eventId} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", ICON_TONES[index % ICON_TONES.length])}>
                        <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/events/${event.eventId}`} className="block font-medium text-[13px] text-neutral-900 truncate hover:underline underline-offset-4">
                          {event.name}
                        </Link>
                        {event.createdAt && (
                          <p className="text-xs text-neutral-500">
                            {new Date(event.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-neutral-900 tabular-nums">{event.issued.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-3 text-[13px] text-neutral-900 tabular-nums">{event.downloaded.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3">
                    <p className="text-[13px] font-medium text-neutral-900 tabular-nums">{event.downloadRate}%</p>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, event.downloadRate)}%` }} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  )
}

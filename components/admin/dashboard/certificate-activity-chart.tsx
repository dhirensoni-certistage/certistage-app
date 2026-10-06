"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { DashboardCard } from "@/components/admin/dashboard/dashboard-card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts"

interface CertificateActivityChartProps {
  data: Array<{ date: string; count: number }>
  loading?: boolean
}

const GOLD = "#C8961E"

function ActivityTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm font-semibold text-neutral-900">{payload[0].value?.toLocaleString("en-IN")} certificates</p>
    </div>
  )
}

export function CertificateActivityChart({ data, loading }: CertificateActivityChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    label: new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
  }))
  const hasActivity = data.some((d) => d.count > 0)

  return (
    <DashboardCard title="Certificate Activity" description="Number of certificates issued over the last 30 days">
      <div className="h-[280px]">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : !hasActivity ? (
          <div className="h-full flex items-center justify-center text-sm text-neutral-500">
            No certificates issued in the last 30 days
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#737373", fontSize: 12 }}
                axisLine={{ stroke: "#E5E5E5" }}
                tickLine={false}
                minTickGap={24}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#737373", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<ActivityTooltip />} cursor={{ stroke: "#D4D4D4", strokeDasharray: "3 3" }} />
              <Line
                type="linear"
                dataKey="count"
                stroke={GOLD}
                strokeWidth={2}
                dot={{ r: 3, fill: "#FFFFFF", stroke: GOLD, strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: GOLD, stroke: "#FFFFFF", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  )
}

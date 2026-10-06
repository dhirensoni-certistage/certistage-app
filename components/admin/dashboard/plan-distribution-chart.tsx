"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { DashboardCard } from "@/components/admin/dashboard/dashboard-card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipProps } from "recharts"

interface PlanDistributionChartProps {
  data: Array<{ plan: string; count: number }>
  loading?: boolean
}

const COLORS: Record<string, string> = {
  free: "#D4D4D4",
  professional: "#E3B64D",
  enterprise: "#C8961E",
  premium: "#171717",
}
const FALLBACK_COLOR = "#A3A3A3"

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  professional: "Professional",
  enterprise: "Enterprise",
  premium: "Premium",
}

function PlanTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs text-neutral-500">{payload[0].name}</p>
      <p className="text-sm font-semibold text-neutral-900">{payload[0].value} users</p>
    </div>
  )
}

export function PlanDistributionChart({ data, loading }: PlanDistributionChartProps) {
  const formattedData = data
    .filter((item) => item.plan != null)
    .map((item) => ({
      name: PLAN_LABELS[item.plan] || item.plan || "Unknown",
      value: item.count,
      plan: item.plan || "free",
    }))
  const total = formattedData.reduce((sum, item) => sum + item.value, 0)

  return (
    <DashboardCard title="Plan Distribution" description="Users on each plan">
      {loading ? (
        <Skeleton className="h-[240px] w-full" />
      ) : formattedData.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-sm text-neutral-500">
          No data available
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={76}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {formattedData.map((entry) => (
                    <Cell key={entry.plan} fill={COLORS[entry.plan] || FALLBACK_COLOR} />
                  ))}
                </Pie>
                <Tooltip content={<PlanTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold text-neutral-900">{total.toLocaleString("en-IN")}</span>
              <span className="text-[11px] text-neutral-500">users</span>
            </div>
          </div>
          <ul className="space-y-2">
            {formattedData.map((entry) => (
              <li key={entry.plan} className="flex items-center gap-2 text-[13px]">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[entry.plan] || FALLBACK_COLOR }} />
                <span className="flex-1 text-neutral-700">{entry.name}</span>
                <span className="font-medium text-neutral-900 tabular-nums">{entry.value.toLocaleString("en-IN")}</span>
                <span className="w-10 text-right text-neutral-500 tabular-nums">
                  {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  )
}

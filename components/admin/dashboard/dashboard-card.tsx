import { cn } from "@/lib/utils"

interface DashboardCardProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  contentClassName?: string
  children: React.ReactNode
}

export function DashboardCard({ title, description, action, className, contentClassName, children }: DashboardCardProps) {
  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white flex flex-col min-w-0", className)}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-neutral-900">{title}</h2>
          {description && <p className="text-[13px] text-neutral-500 mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn("px-5 pb-5 flex-1 min-h-0", contentClassName)}>{children}</div>
    </section>
  )
}

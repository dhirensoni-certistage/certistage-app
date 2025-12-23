import { Skeleton } from "./skeleton"
import { Card, CardContent, CardHeader } from "./card"

// Dashboard Card Skeleton
export function DashboardCardSkeleton() {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <Skeleton className="h-8 w-16" />
            </CardContent>
        </Card>
    )
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <tr className="border-b">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="p-3">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    )
}

// Chart Skeleton
export function ChartSkeleton({ height = "280px" }: { height?: string }) {
    return (
        <div className="space-y-3" style={{ height }}>
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="flex items-end justify-between gap-2 h-full">
                {[60, 80, 45, 90, 70, 55, 85].map((h, i) => (
                    <Skeleton
                        key={i}
                        className="w-full rounded-t-md"
                        style={{ height: `${h}%` }}
                    />
                ))}
            </div>
        </div>
    )
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                </div>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-10 w-20 mb-2" />
                <Skeleton className="h-2 w-full" />
            </CardContent>
        </Card>
    )
}

// List Item Skeleton
export function ListItemSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 border-b">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
        </div>
    )
}

// Form Skeleton
export function FormSkeleton() {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-24 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
        </div>
    )
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
    return (
        <div className="space-y-2 mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
        </div>
    )
}

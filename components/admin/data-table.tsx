"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, ChevronRight, Trash2, Download, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface BulkAction {
  label: string
  icon?: React.ReactNode
  onClick: (selectedIds: string[]) => void
  variant?: "default" | "destructive"
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pagination?: Pagination
  onPageChange?: (page: number) => void
  onRowClick?: (item: T) => void
  loading?: boolean
  emptyMessage?: string
  rowKey?: (item: T) => string
  selectable?: boolean
  bulkActions?: BulkAction[]
  onSelectionChange?: (selectedIds: string[]) => void
}

export function DataTable<T extends object>({
  columns,
  data,
  pagination,
  onPageChange,
  onRowClick,
  loading = false,
  emptyMessage = "No data found",
  rowKey,
  selectable = false,
  bulkActions = [],
  onSelectionChange
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Reset selection when data changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [data])

  const getItemId = (item: T, index: number): string => {
    if (rowKey) return rowKey(item)
    const anyItem = item as any
    return anyItem._id || anyItem.id || String(index)
  }

  const allSelected = data.length > 0 && data.every((item, i) => selectedIds.has(getItemId(item, i)))
  const someSelected = selectedIds.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
      onSelectionChange?.([])
    } else {
      const allIds = new Set(data.map((item, i) => getItemId(item, i)))
      setSelectedIds(allIds)
      onSelectionChange?.(Array.from(allIds))
    }
  }

  const toggleOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    onSelectionChange?.(Array.from(newSelected))
  }

  const handleBulkAction = (action: BulkAction) => {
    action.onClick(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>}
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && <TableHead className="w-12" />}
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectable && selectedIds.size > 0 && bulkActions.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex-1" />
          {bulkActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant === "destructive" ? "destructive" : "outline"}
              size="sm"
              onClick={() => handleBulkAction(action)}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = someSelected
                    }}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => {
              const itemId = getItemId(item, index)
              const isSelected = selectedIds.has(itemId)
              
              return (
                <TableRow
                  key={itemId}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    isSelected && "bg-muted/50",
                    "hover:bg-muted/50"
                  )}
                  onClick={(e) => {
                    // Don't trigger row click if clicking checkbox
                    if ((e.target as HTMLElement).closest('[role="checkbox"]')) return
                    onRowClick?.(item)
                  }}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(itemId)}
                        aria-label={`Select row ${index + 1}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} results
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange?.(pagination.page - 1)} disabled={pagination.page <= 1}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => onPageChange?.(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

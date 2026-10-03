"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArchiveRestore, Award, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { restoreDeleted } from "@/lib/client-trash"
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus"

interface TrashBatch {
  batchId: string
  kind: "recipient" | "certificateType"
  label: string
  count: number
  context: string
  eventId: string
  eventName: string
  deletedAt: string
  expiresAt: string
}

const DAY = 86400000

function deletedWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3600000) return "Deleted just now"
  if (diff < DAY) return `Deleted ${Math.floor(diff / 3600000)}h ago`
  const days = Math.floor(diff / DAY)
  if (days === 1) return "Deleted yesterday"
  return `Deleted ${days} days ago`
}

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY))
}

export default function TrashPage() {
  const router = useRouter()
  const [items, setItems] = useState<TrashBatch[] | null>(null)
  const [retentionDays, setRetentionDays] = useState(30)
  const [restoring, setRestoring] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/client/trash")
      if (res.status === 401) { router.push("/client/login"); return }
      const data = await res.json()
      if (res.ok) {
        setItems(data.items || [])
        if (data.retentionDays) setRetentionDays(data.retentionDays)
      } else {
        toast.error(data.error || "Could not load recently deleted items")
        setItems([])
      }
    } catch {
      toast.error("Could not load recently deleted items")
      setItems([])
    }
  }, [router])

  useEffect(() => {
    const sessionStr = localStorage.getItem("clientSession")
    if (!sessionStr) { router.push("/client/login"); return }
    load()
  }, [load, router])

  useRefreshOnFocus(load, 60000, items !== null)

  const handleRestore = async (batch: TrashBatch) => {
    setRestoring(batch.batchId)
    const result = await restoreDeleted(batch.batchId)
    setRestoring(null)
    if (result.ok) {
      const parts: string[] = []
      if (result.certificateTypes) parts.push(`${batch.label} certificate`)
      if (result.recipients) parts.push(`${result.recipients.toLocaleString("en-IN")} recipient${result.recipients === 1 ? "" : "s"}`)
      toast.success(parts.length ? `Restored ${parts.join(" and ")}` : "Restored")
      setItems((prev) => (prev || []).filter((i) => i.batchId !== batch.batchId))
    } else {
      toast.error(result.error || "Could not restore")
    }
  }

  const title = (b: TrashBatch) => {
    if (b.kind === "certificateType") return b.label
    if (b.count <= 1) return b.label || "1 recipient"
    return `${b.label} and ${(b.count - 1).toLocaleString("en-IN")} other${b.count - 1 === 1 ? "" : "s"}`
  }

  const subtitle = (b: TrashBatch) => {
    const bits: string[] = []
    if (b.kind === "certificateType") bits.push(`Certificate · ${b.context}`)
    else bits.push(b.count > 1 ? `${b.count.toLocaleString("en-IN")} recipients${b.context ? ` · ${b.context}` : ""}` : `Recipient${b.context ? ` · ${b.context}` : ""}`)
    if (b.eventName) bits.push(b.eventName)
    return bits.join(" · ")
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[22px] md:text-[26px] font-semibold text-neutral-900 tracking-tight">Recently deleted</h1>
        <p className="text-[13px] text-neutral-500 mt-1.5">
          Deleted recipients and certificates stay here for {retentionDays} days, then they are removed for good.
        </p>
      </div>

      {items === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-[72px] rounded-xl border border-neutral-200 bg-white animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
            <ArchiveRestore className="h-5 w-5 text-neutral-500" />
          </div>
          <p className="text-[14px] font-medium text-neutral-900">Nothing deleted recently</p>
          <p className="text-[13px] text-neutral-500 mt-1">Anything you delete from Recipients or Certificates will show up here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
          {items.map((b) => {
            const left = daysLeft(b.expiresAt)
            const Icon = b.kind === "certificateType" ? Award : Users
            return (
              <div key={b.batchId} className="flex items-center gap-3.5 px-4 py-3.5">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", b.kind === "certificateType" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700")}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-neutral-900 truncate">{title(b)}</p>
                  <p className="text-[12.5px] text-neutral-500 truncate">{subtitle(b)}</p>
                  <p className="text-[12px] text-neutral-400 mt-0.5 flex flex-wrap gap-x-1.5">
                    <span className="whitespace-nowrap">{deletedWhen(b.deletedAt)}</span>
                    <span className="hidden sm:inline">·</span>
                    <span className={cn("whitespace-nowrap", left <= 3 && "text-amber-700")}>{left === 0 ? "Removed today" : `${left} day${left === 1 ? "" : "s"} left`}</span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restoring === b.batchId}
                  onClick={() => handleRestore(b)}
                  className="h-8 px-3 border-neutral-200 hover:bg-neutral-50 text-[13px] shrink-0"
                >
                  {restoring === b.batchId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Restore"}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

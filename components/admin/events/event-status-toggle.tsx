"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface EventStatusToggleProps {
  eventId: string
  isActive: boolean
  onStatusChange?: (isActive: boolean) => void
}

export function EventStatusToggle({ eventId, isActive, onStatusChange }: EventStatusToggleProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(isActive)

  const handleToggle = () => setShowDialog(true)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (res.ok) {
        const newStatus = !currentStatus
        setCurrentStatus(newStatus)
        onStatusChange?.(newStatus)
        toast.success(`Event ${newStatus ? "activated" : "deactivated"} successfully`)
      } else {
        toast.error("Failed to update event status")
      }
    } catch (error) {
      toast.error("Failed to update event status")
    } finally {
      setLoading(false)
      setShowDialog(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{currentStatus ? "Active" : "Inactive"}</span>
        <Switch checked={currentStatus} onCheckedChange={handleToggle} disabled={loading} />
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{currentStatus ? "Deactivate Event?" : "Activate Event?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {currentStatus
                ? "Deactivating this event will prevent certificate downloads. Recipients will not be able to download their certificates."
                : "Activating this event will allow certificate downloads."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={loading}>
              {loading ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
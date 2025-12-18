"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
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

interface UserStatusToggleProps {
  userId: string
  isActive: boolean
  onStatusChange?: (isActive: boolean) => void
}

export function UserStatusToggle({ userId, isActive, onStatusChange }: UserStatusToggleProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(isActive)

  const handleToggle = () => {
    setShowDialog(true)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (res.ok) {
        const newStatus = !currentStatus
        setCurrentStatus(newStatus)
        onStatusChange?.(newStatus)
        toast.success(`User ${newStatus ? "activated" : "deactivated"} successfully`)
      } else {
        toast.error("Failed to update user status")
      }
    } catch (error) {
      toast.error("Failed to update user status")
    } finally {
      setLoading(false)
      setShowDialog(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {currentStatus ? "Active" : "Inactive"}
        </span>
        <Switch checked={currentStatus} onCheckedChange={handleToggle} disabled={loading} />
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentStatus ? "Deactivate User?" : "Activate User?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentStatus
                ? "This user will not be able to log in. Their data will be preserved."
                : "This user will be able to log in and access their account."}
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
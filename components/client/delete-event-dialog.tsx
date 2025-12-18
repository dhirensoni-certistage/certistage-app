"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { deleteEvent, getUserEvents, type CertificateEvent } from "@/lib/events"
import { getClientSession, updateSessionEvent } from "@/lib/auth"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface DeleteEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CertificateEvent
  isActiveEvent: boolean
  onSuccess: () => void
}

export function DeleteEventDialog({ 
  open, 
  onOpenChange, 
  event, 
  isActiveEvent,
  onSuccess 
}: DeleteEventDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    
    const success = deleteEvent(event.id)
    
    if (!success) {
      toast.error("Failed to delete event")
      setLoading(false)
      return
    }

    toast.success(`Event "${event.name}" deleted successfully`)
    
    // If this was the active event, switch to another or clear
    if (isActiveEvent) {
      const session = getClientSession()
      if (session?.userId) {
        const remainingEvents = getUserEvents(session.userId)
        if (remainingEvents.length > 0) {
          // Switch to first remaining event
          updateSessionEvent(remainingEvents[0].id, remainingEvents[0].name)
          toast.info(`Switched to "${remainingEvents[0].name}"`)
        } else {
          // No events left, clear session event
          updateSessionEvent("", "")
        }
      }
    }
    
    setLoading(false)
    onSuccess()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Event</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Are you sure you want to delete <strong>"{event.name}"</strong>?
            </span>
            <span className="block text-destructive">
              This will permanently delete all {event.stats.certificateTypesCount} certificate types 
              and {event.stats.total} recipients associated with this event.
            </span>
            {isActiveEvent && (
              <span className="block font-medium">
                This is your currently active event. You will be switched to another event after deletion.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete Event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

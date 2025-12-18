"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface EventData {
  _id: string
  name: string
  description?: string
}

interface EditEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: EventData
  onSuccess: () => void
}

export function EditEventDialog({ open, onOpenChange, event, onSuccess }: EditEventDialogProps) {
  const [name, setName] = useState(event.name)
  const [description, setDescription] = useState(event.description || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setName(event.name)
    setDescription(event.description || "")
  }, [event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Event name is required")
      return
    }

    setLoading(true)
    
    try {
      // Get userId from session
      const sessionStr = localStorage.getItem("clientSession")
      if (!sessionStr) {
        setError("Session expired. Please login again.")
        setLoading(false)
        return
      }
      const session = JSON.parse(sessionStr)

      const res = await fetch("/api/client/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          eventId: event._id,
          name: name.trim(),
          description: description.trim() || undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to update event")
        setLoading(false)
        return
      }

      toast.success(`Event "${data.event.name}" updated successfully!`)
      setLoading(false)
      onSuccess()
    } catch (error) {
      console.error("Update event error:", error)
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update your event details
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Event Name *</Label>
            <Input
              id="edit-name"
              placeholder="e.g., Annual Conference 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Brief description of the event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Check, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getClientSession, updateSessionEvent, PLAN_FEATURES, type PlanType } from "@/lib/auth"
import { getUserEvents, getEvent, type CertificateEvent } from "@/lib/events"

interface EventSwitcherProps {
  onEventChange?: () => void
}

export function EventSwitcher({ onEventChange }: EventSwitcherProps) {
  const router = useRouter()
  const [events, setEvents] = useState<CertificateEvent[]>([])
  const [currentEvent, setCurrentEvent] = useState<CertificateEvent | null>(null)
  const [userPlan, setUserPlan] = useState<PlanType>("free")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = () => {
    const session = getClientSession()
    if (!session || session.loginType !== "user" || !session.userId) return

    setUserPlan(session.userPlan || "free")
    const userEvents = getUserEvents(session.userId)
    setEvents(userEvents)

    // Get current event
    if (session.eventId) {
      const event = getEvent(session.eventId)
      setCurrentEvent(event)
    }
  }

  const handleEventSelect = (event: CertificateEvent) => {
    updateSessionEvent(event.id, event.name)
    setCurrentEvent(event)
    setOpen(false)
    onEventChange?.()
    router.refresh()
  }

  const planFeatures = PLAN_FEATURES[userPlan]
  const canCreateEvent = planFeatures.canCreateEvent && 
    (planFeatures.maxEvents === -1 || events.length < planFeatures.maxEvents)

  if (events.length === 0 && !currentEvent) {
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto text-left font-normal hover:bg-sidebar-accent"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground">
              {currentEvent?.name || "Select Event"}
            </p>
            <p className="text-xs text-sidebar-muted truncate">
              {currentEvent ? `${currentEvent.stats.total} recipients` : "No event selected"}
            </p>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 text-sidebar-muted transition-transform",
            open && "rotate-180"
          )} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {events.map((event) => (
          <DropdownMenuItem
            key={event.id}
            onClick={() => handleEventSelect(event)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{event.name}</p>
              <p className="text-xs text-muted-foreground">
                {event.stats.total} recipients
              </p>
            </div>
            {currentEvent?.id === event.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        {canCreateEvent && (
          <DropdownMenuItem
            onClick={() => {
              setOpen(false)
              router.push("/client/events?create=true")
            }}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Event
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem
          onClick={() => {
            setOpen(false)
            router.push("/client/events")
          }}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Events
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

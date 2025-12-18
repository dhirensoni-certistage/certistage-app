"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PLAN_FEATURES, type PlanType } from "@/lib/auth"
import { 
  Plus, 
  Pencil,
  Crown,
  FolderOpen,
  Search,
  Calendar,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { CreateEventDialog } from "@/components/client/create-event-dialog"
import { EditEventDialog } from "@/components/client/edit-event-dialog"
import { cn } from "@/lib/utils"

interface EventWithStats {
  _id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  stats: {
    certificateTypesCount: number
    total: number
    downloaded: number
    pending: number
  }
}

// Generate consistent gradient based on event id - better hash distribution
const getEventGradient = (id: string, index: number) => {
  const gradients = [
    "from-blue-600 via-blue-500 to-cyan-400",
    "from-violet-600 via-purple-500 to-fuchsia-400",
    "from-emerald-600 via-teal-500 to-cyan-400",
    "from-orange-500 via-amber-500 to-yellow-400",
    "from-rose-600 via-pink-500 to-fuchsia-400",
    "from-indigo-600 via-blue-500 to-sky-400",
    "from-slate-600 via-slate-500 to-zinc-400",
    "from-teal-600 via-emerald-500 to-green-400",
    "from-pink-600 via-rose-500 to-red-400",
    "from-cyan-600 via-sky-500 to-blue-400",
  ]
  // Use combination of index and id hash for better distribution
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  // Combine with index to ensure adjacent events get different colors
  const combinedIndex = (Math.abs(hash) + index) % gradients.length
  return gradients[combinedIndex]
}

export default function EventsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<PlanType>("free")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<EventWithStats | null>(null)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [usage, setUsage] = useState<{ events: number; maxEvents: number } | null>(null)

  useEffect(() => {
    const sessionStr = localStorage.getItem("clientSession")
    if (!sessionStr) {
      router.push("/client/login")
      return
    }
    
    const session = JSON.parse(sessionStr)
    if (!session.userId) {
      router.push("/client/login")
      return
    }
    
    setUserId(session.userId)
    setUserPlan(session.userPlan || "free")
    setActiveEventId(session.eventId || null)
    loadEvents(session.userId)

    if (searchParams.get("create") === "true") {
      setCreateDialogOpen(true)
    }
  }, [router, searchParams])

  const loadEvents = async (uid: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/client/events?userId=${uid}`)
      const data = await res.json()
      
      if (res.ok) {
        setEvents(data.events || [])
        if (data.usage) {
          setUsage({
            events: data.usage.usage.events,
            maxEvents: data.usage.limits.maxEvents
          })
        }
      }
    } catch (error) {
      console.error("Failed to load events:", error)
      toast.error("Failed to load events")
    }
    setIsLoading(false)
  }

  const handleEventClick = (event: EventWithStats) => {
    // Update session with selected event
    const sessionStr = localStorage.getItem("clientSession")
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      session.eventId = event._id
      session.eventName = event.name
      localStorage.setItem("clientSession", JSON.stringify(session))
    }
    setActiveEventId(event._id)
    toast.success(`Switched to "${event.name}"`)
    router.push("/client/dashboard")
  }

  const canCreate = usage ? {
    canCreate: usage.maxEvents === 0 ? false : usage.events < usage.maxEvents,
    currentCount: usage.events,
    maxEvents: usage.maxEvents
  } : { canCreate: false, currentCount: 0, maxEvents: 0 }
  
  const planFeatures = PLAN_FEATURES[userPlan]

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Discover events</h1>
        </div>
        {canCreate.canCreate ? (
          <Button onClick={() => setCreateDialogOpen(true)} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        ) : (
          <Button asChild className="gap-2 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600">
            <a href="/client/upgrade">
              <Crown className="h-4 w-4" />
              Upgrade
            </a>
          </Button>
        )}
      </div>

      {/* Search */}
      {events.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Event"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      )}

      {/* Plan Usage Info */}
      {canCreate.maxEvents !== -1 && (
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <Badge variant="outline">{planFeatures.displayName}</Badge>
          <span>{canCreate.currentCount} of {canCreate.maxEvents} events used</span>
          {canCreate.currentCount >= canCreate.maxEvents && (
            <a href="/client/upgrade" className="text-primary hover:underline ml-2">Upgrade for more</a>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event, index) => (
            <div
              key={event._id}
              className="group rounded-xl overflow-hidden border bg-card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleEventClick(event)}
            >
              {/* Banner with gradient and event name */}
              <div className={cn(
                "relative h-40 bg-gradient-to-br p-5 flex flex-col justify-between",
                getEventGradient(event._id, index)
              )}>
                {/* Decorative circles */}
                <div className="absolute top-4 left-4 w-20 h-20 border border-white/20 rounded-full" />
                <div className="absolute top-8 left-8 w-12 h-12 border border-white/10 rounded-full" />
                <div className="absolute bottom-4 right-4 w-16 h-16 border border-white/15 rounded-full" />
                
                {/* Top row - Badge & Actions */}
                <div className="relative flex items-start justify-between">
                  {activeEventId === event._id && (
                    <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>
                  )}
                  {activeEventId !== event._id && <div />}
                  
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
                      onClick={(e) => { e.stopPropagation(); setEditEvent(event) }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-white" />
                    </Button>
                  </div>
                </div>

                {/* Event Name */}
                <div className="relative">
                  <h3 className="text-xl font-bold text-white leading-tight line-clamp-2">
                    {event.name}
                  </h3>
                </div>
              </div>

              {/* Info Section */}
              <div className="p-4">
                <h4 className="font-medium text-sm truncate">{event.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{format(new Date(event.createdAt), "d MMM, yyyy")}</span>
                  <span className="mx-1">•</span>
                  <span>{event.stats.certificateTypesCount} certs</span>
                  <span className="mx-1">•</span>
                  <span>{event.stats.total} recipients</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        /* No search results */
        <div className="text-center py-16">
          <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No events match your search</p>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No events yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Create your first event to get started</p>
          {canCreate.canCreate ? (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Create Event
            </Button>
          ) : (
            <Button asChild className="gap-2 bg-gradient-to-r from-violet-500 to-indigo-500">
              <a href="/client/upgrade"><Crown className="h-4 w-4" />Upgrade to Create</a>
            </Button>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CreateEventDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        userId={userId || ""}
        onSuccess={() => { if (userId) loadEvents(userId); setCreateDialogOpen(false) }}
      />
      
      {editEvent && (
        <EditEventDialog
          open={!!editEvent}
          onOpenChange={(open: boolean) => !open && setEditEvent(null)}
          event={editEvent}
          onSuccess={() => { if (userId) loadEvents(userId); setEditEvent(null) }}
        />
      )}
    </div>
  )
}

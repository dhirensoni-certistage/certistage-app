"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getPlanFeaturesMap, normalizePlanId, type PlanType } from "@/lib/auth"
import {
  Plus,
  Pencil,
  Crown,
  FolderOpen,
  Search,
  Calendar,
  Loader2,
  ChevronRight,
  MoreVertical
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { CreateEventDialog } from "@/components/client/create-event-dialog"
import { EditEventDialog } from "@/components/client/edit-event-dialog"
import { cn } from "@/lib/utils"
import { fetchClientProfile, applyProfileToSession } from "@/lib/client-profile"

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

export default function EventsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<EventWithStats[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [userPlan, setUserPlan] = useState<PlanType>("free")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<EventWithStats | null>(null)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [usage, setUsage] = useState<{ events: number; maxEvents: number } | null>(null)

  const normalizePlan = (plan?: string): PlanType => normalizePlanId(plan)

  const syncPlanFromServer = async () => {
    const result = await fetchClientProfile()
    if (!result.ok || !result.user) return
    const updated = applyProfileToSession(result.user)
    if (updated) setUserPlan(normalizePlan(updated.userPlan))
  }

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
    setUserEmail(session.userEmail || "")
    setUserPlan(normalizePlan(session.userPlan))
    setActiveEventId(session.eventId || null)
    loadEvents(session.userId)
    syncPlanFromServer()

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
      toast.error("Failed to load events")
    }
    setIsLoading(false)
  }

  const handleEventClick = (event: EventWithStats) => {
    const sessionStr = localStorage.getItem("clientSession")
    if (sessionStr) {
      const session = JSON.parse(sessionStr)
      session.eventId = event._id
      session.eventName = event.name
      localStorage.setItem("clientSession", JSON.stringify(session))
    }
    setActiveEventId(event._id)
    router.push("/client/dashboard")
  }

  const canCreate = usage ? {
    canCreate: usage.maxEvents === 0 ? false : usage.events < usage.maxEvents,
    currentCount: usage.events,
    maxEvents: usage.maxEvents
  } : { canCreate: false, currentCount: 0, maxEvents: 0 }

  const filteredEvents = events.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const planFeaturesMap = getPlanFeaturesMap()

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-none">Events</h1>
          <p className="text-[13px] text-neutral-500 mt-2">
            Signed in as <span className="font-medium text-neutral-900">{userEmail}</span>
          </p>
        </div>
        {canCreate.canCreate ? (
          <Button onClick={() => setCreateDialogOpen(true)} className="h-9 px-4 text-sm font-medium bg-neutral-900 text-white hover:bg-black w-fit">
            <Plus className="h-4 w-4 mr-1.5" /> New event
          </Button>
        ) : (
          <Button asChild className="h-9 px-4 text-sm font-medium bg-neutral-900 text-white hover:bg-black w-fit">
            <Link href="/client/upgrade"><Crown className="h-4 w-4 mr-1.5" /> Upgrade to add events</Link>
          </Button>
        )}
      </div>

      {/* Plan + search row */}
      {(events.length > 0 || canCreate.maxEvents !== -1) && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {events.length > 0 ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input placeholder="Search events" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm border-neutral-200 bg-white rounded-md focus-visible:ring-1 focus-visible:ring-neutral-900" />
            </div>
          ) : <div />}
          {canCreate.maxEvents !== -1 && (
            <p className="text-[13px] text-neutral-500">
              {canCreate.currentCount} of {canCreate.maxEvents} events on the {planFeaturesMap[userPlan]?.displayName} plan
              {canCreate.currentCount >= canCreate.maxEvents && <> · <Link href="/client/upgrade" className="text-neutral-900 underline underline-offset-4">Upgrade</Link></>}
            </p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[150px] rounded-xl border border-neutral-200 bg-white animate-pulse" />)}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <div
              key={event._id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") handleEventClick(event) }}
              className={cn(
                "group relative bg-white rounded-xl border p-5 cursor-pointer transition-all flex flex-col justify-between min-h-[150px] hover:border-neutral-400 hover:shadow-[0_6px_20px_-12px_rgba(0,0,0,0.25)]",
                activeEventId === event._id ? "border-neutral-900" : "border-neutral-200"
              )}
              onClick={() => handleEventClick(event)}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold text-neutral-900 leading-snug tracking-tight line-clamp-2">{event.name}</h3>
                  <p className="text-[12px] text-neutral-500 mt-1">Created {format(new Date(event.createdAt), "MMM d, yyyy")}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditEvent(event) }}
                  className="h-8 w-8 -mr-2 -mt-1 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors shrink-0"
                  aria-label="Edit event"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-5">
                <p className="text-[13px] text-neutral-600">
                  <span className="font-medium text-neutral-900">{event.stats.certificateTypesCount}</span> certificate{event.stats.certificateTypesCount === 1 ? "" : "s"}
                  <span className="mx-1.5 text-neutral-300">·</span>
                  <span className="font-medium text-neutral-900">{event.stats.total.toLocaleString("en-IN")}</span> recipient{event.stats.total === 1 ? "" : "s"}
                </p>
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-neutral-500 group-hover:text-neutral-900 transition-colors">
                  {activeEventId === event._id ? "Current" : "Open"} <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="text-center py-20">
          <h3 className="text-sm font-semibold text-neutral-900 mb-1">No events match your search</h3>
          <p className="text-xs text-neutral-500">Try a different name.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 tracking-tight mb-1">No events yet</h3>
          <p className="text-[14px] text-neutral-500 max-w-[380px] mx-auto mb-6">
            An event holds your certificate designs and the people who receive them. Create one to get started.
          </p>
          {canCreate.canCreate ? (
            <Button onClick={() => setCreateDialogOpen(true)} className="h-10 px-5 text-sm font-medium bg-neutral-900 text-white hover:bg-black">
              <Plus className="h-4 w-4 mr-1.5" /> Create your first event
            </Button>
          ) : (
            <Button asChild className="h-10 px-5 text-sm font-medium bg-neutral-900 text-white hover:bg-black">
              <Link href="/client/upgrade"><Crown className="h-4 w-4 mr-1.5" /> Upgrade to create events</Link>
            </Button>
          )}
          <p className="text-[12px] text-neutral-400 mt-8">
            Expecting to see events here? You are signed in as <span className="font-medium text-neutral-600">{userEmail}</span>.
            If your events were created under a different email, <Link href="/client/login" onClick={() => localStorage.removeItem("clientSession")} className="text-neutral-700 underline underline-offset-4">sign in with that account</Link>.
          </p>
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

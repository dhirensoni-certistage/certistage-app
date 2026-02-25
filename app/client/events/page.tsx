"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PLAN_FEATURES, type PlanType } from "@/lib/auth"
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
  const [userPlan, setUserPlan] = useState<PlanType>("free")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<EventWithStats | null>(null)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [usage, setUsage] = useState<{ events: number; maxEvents: number } | null>(null)

  const normalizePlan = (plan?: string): PlanType => {
    const candidate = String(plan || "free").toLowerCase()
    const validPlans: PlanType[] = ["free", "professional", "enterprise", "premium"]
    return validPlans.includes(candidate as PlanType) ? (candidate as PlanType) : "free"
  }

  const syncPlanFromServer = async (uid: string) => {
    try {
      const res = await fetch(`/api/client/profile?userId=${encodeURIComponent(uid)}`)
      if (!res.ok) return
      const data = await res.json()
      const serverPlan = normalizePlan(data.user?.plan)
      setUserPlan(serverPlan)

      const sessionStr = localStorage.getItem("clientSession")
      if (sessionStr) {
        const session = JSON.parse(sessionStr)
        session.userPlan = serverPlan
        session.planExpiresAt = data.user?.planExpiresAt
        localStorage.setItem("clientSession", JSON.stringify(session))
      }
    } catch (error) {
      console.error("Failed to sync plan:", error)
    }
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
    setUserPlan(normalizePlan(session.userPlan))
    setActiveEventId(session.eventId || null)
    loadEvents(session.userId)
    syncPlanFromServer(session.userId)

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

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-[28px] font-semibold text-black tracking-tight leading-none">Your Projects</h1>
          <p className="text-[14px] text-[#666] font-medium leading-relaxed">Manage your events and digital credentials</p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate.canCreate ? (
            <Button onClick={() => setCreateDialogOpen(true)} className="h-9 px-4 text-sm font-medium bg-black text-white hover:bg-[#222] shadow-sm rounded-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          ) : (
            <Button asChild className="h-9 px-4 text-sm font-medium bg-black text-white hover:bg-[#222] shadow-sm rounded-sm">
              <Link href="/client/upgrade">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      {canCreate.maxEvents !== -1 && (
        <div className="mb-8 flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-sm shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1">Plan Level</span>
              <span className="text-[13px] font-semibold text-black uppercase tracking-tight">{PLAN_FEATURES[userPlan]?.displayName}</span>
            </div>
            <div className="h-8 w-px bg-[#E5E5E5]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1">Project Usage</span>
              <span className="text-[13px] font-medium text-black">{canCreate.currentCount} of {canCreate.maxEvents} projects used</span>
            </div>
          </div>
          {canCreate.currentCount >= canCreate.maxEvents && (
            <Link href="/client/upgrade" className="text-xs font-semibold text-black hover:underline">Get more projects →</Link>
          )}
        </div>
      )}

      {/* Search & Filter */}
      {events.length > 0 && (
        <div className="mb-8">
          <div className="relative max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999] group-focus-within:text-black transition-colors" />
            <Input
              placeholder="Filter projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm border-[#E5E5E5] bg-white focus-visible:ring-1 focus-visible:ring-black rounded-sm placeholder:text-[#BBB]"
            />
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#CCC]" />
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((event) => (
            <div
              key={event._id}
              className={cn(
                "group relative border bg-white rounded-md p-5 transition-all cursor-pointer overflow-hidden flex flex-col justify-between h-[200px] hover:shadow-md",
                activeEventId === event._id
                  ? "border-black ring-1 ring-black shadow-md"
                  : "border-[#E5E5E5] hover:border-[#CCC]"
              )}
              onClick={() => handleEventClick(event)}
            >
              {/* Top Row */}
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <h3 className="text-[16px] font-semibold text-black leading-tight tracking-tight line-clamp-1">
                    {event.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#888] font-medium">
                    <Calendar className="h-3 w-3" />
                    <span>Created {format(new Date(event.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditEvent(event) }}
                  className="h-7 w-7 rounded-sm flex items-center justify-center text-[#999] hover:text-black hover:bg-neutral-100 transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className="p-2.5 rounded-sm bg-[#FAFAFA] border border-[#F0F0F0]">
                  <p className="text-[9px] font-semibold text-[#888] uppercase tracking-wider mb-0.5">Templates</p>
                  <p className="text-[15px] font-semibold text-black">{event.stats.certificateTypesCount}</p>
                </div>
                <div className="p-2.5 rounded-sm bg-[#FAFAFA] border border-[#F0F0F0]">
                  <p className="text-[9px] font-semibold text-[#888] uppercase tracking-wider mb-0.5">Attendees</p>
                  <p className="text-[15px] font-semibold text-black">{event.stats.total}</p>
                </div>
              </div>

              {/* Inset Badge for Active */}
              {activeEventId === event._id && (
                <div className="absolute top-3 right-3">
                  <div className="w-2 h-2 rounded-full bg-black shadow-[0_0_6px_rgba(0,0,0,0.3)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="text-center py-24">
          <div className="h-12 w-12 rounded-sm bg-[#F5F5F5] border border-[#E5E5E5] flex items-center justify-center mx-auto mb-4">
            <Search className="h-5 w-5 text-[#999]" />
          </div>
          <h3 className="text-sm font-semibold text-black mb-1">No projects found</h3>
          <p className="text-xs text-[#666]">Try adjusting your search.</p>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-20 rounded-md border border-dashed border-[#E5E5E5] bg-[#FAFAFA]">
          <div className="h-12 w-12 rounded-sm bg-white border border-[#E5E5E5] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FolderOpen className="h-5 w-5 text-[#999]" />
          </div>
          <h3 className="text-lg font-semibold text-black mb-1 tracking-tight">No projects yet</h3>
          <p className="text-[14px] text-[#666] max-w-[360px] mx-auto mb-8 font-medium">
            Create your first workspace to start issuing certificates.
          </p>
          {canCreate.canCreate ? (
            <Button onClick={() => setCreateDialogOpen(true)} className="h-10 px-6 text-sm font-medium bg-black text-white hover:bg-[#222] shadow-sm rounded-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          ) : (
            <Button asChild className="h-10 px-6 text-sm font-medium bg-black text-white hover:bg-[#222] shadow-sm rounded-sm">
              <Link href="/client/upgrade">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Create
              </Link>
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

"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EventStatusToggle } from "@/components/admin/events/event-status-toggle"
import { ArrowLeft, User, Calendar, Award, Download } from "lucide-react"

interface EventDetails {
  event: { _id: string; name: string; description?: string; isActive: boolean; createdAt: string }
  owner: { _id: string; name: string; email: string } | null
  certificateTypes: Array<{ _id: string; name: string; isActive: boolean; recipientsCount: number; downloadedCount: number }>
  stats: { totalCertificateTypes: number; totalRecipients: number; totalDownloaded: number; downloadRate: number }
}

export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<EventDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEventDetails()
  }, [eventId])

  const fetchEventDetails = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`)
      if (res.ok) setData(await res.json())
    } catch (error) {
      console.error("Failed to fetch event:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (isActive: boolean) => {
    if (data) setData({ ...data, event: { ...data.event, isActive } })
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Event Details" description="Loading..." />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <AdminHeader title="Event Not Found" description="" />
        <div className="flex-1 p-6 text-center">
          <p className="text-muted-foreground">Event not found</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </div>
      </>
    )
  }

  const { event, owner, certificateTypes, stats } = data

  return (
    <>
      <AdminHeader title={event.name} description={event.description || "Event details"} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
          </Button>

          {/* Event Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Event Information</CardTitle>
              <EventStatusToggle eventId={event._id} isActive={event.isActive} onStatusChange={handleStatusChange} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Created {new Date(event.createdAt).toLocaleDateString("en-IN")}
              </div>
              {owner && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Owner: {owner.name} ({owner.email})</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{stats.totalCertificateTypes}</p><p className="text-xs text-muted-foreground">Cert Types</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{stats.totalRecipients}</p><p className="text-xs text-muted-foreground">Recipients</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{stats.totalDownloaded}</p><p className="text-xs text-muted-foreground">Downloaded</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{stats.downloadRate}%</p><p className="text-xs text-muted-foreground">Download Rate</p></CardContent></Card>
          </div>

          {/* Certificate Types */}
          <Card>
            <CardHeader><CardTitle>Certificate Types ({certificateTypes.length})</CardTitle></CardHeader>
            <CardContent>
              {certificateTypes.length === 0 ? <p className="text-muted-foreground">No certificate types</p> : (
                <div className="space-y-2">
                  {certificateTypes.map((ct) => (
                    <div key={ct._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{ct.name}</p>
                          <p className="text-sm text-muted-foreground">{ct.recipientsCount} recipients</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium flex items-center gap-1"><Download className="h-3 w-3" />{ct.downloadedCount}</p>
                        </div>
                        <Badge variant={ct.isActive ? "default" : "secondary"}>{ct.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
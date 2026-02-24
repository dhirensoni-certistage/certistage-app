"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EventStatusToggle } from "@/components/admin/events/event-status-toggle"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"
import { ArrowLeft, User, Calendar, Award, Download, FileText, Users, ExternalLink } from "lucide-react"

interface EventDetails {
  event: { _id: string; name: string; description?: string; isActive: boolean; createdAt: string }
  owner: { _id: string; name: string; email: string; plan?: string } | null
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
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-64 w-full" />
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
          <Breadcrumbs items={[
            { label: "Events", href: "/admin/events" },
            { label: event.name }
          ]} />

          {/* Event Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{event.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(event.createdAt).toLocaleDateString("en-IN", { 
                      day: "numeric", month: "long", year: "numeric" 
                    })}
                  </p>
                </div>
              </div>
              <EventStatusToggle eventId={event._id} isActive={event.isActive} onStatusChange={handleStatusChange} />
            </CardHeader>
            <CardContent>
              {owner && (
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border mt-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">{owner.name}</p>
                      <p className="text-sm text-muted-foreground">{owner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {owner.plan && (
                      <Badge variant="outline" className="capitalize">{owner.plan}</Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/admin/users/${owner._id}`)}
                    >
                      View User
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalCertificateTypes}</p>
                    <p className="text-xs text-blue-600/70">Certificate Types</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalRecipients}</p>
                    <p className="text-xs text-purple-600/70">Recipients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-neutral-50 dark:bg-neutral-900/20 border-neutral-200 dark:border-neutral-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Download className="h-8 w-8 text-neutral-600" />
                  <div>
                    <p className="text-2xl font-bold text-neutral-600">{stats.totalDownloaded}</p>
                    <p className="text-xs text-neutral-600/70">Downloaded</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Award className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{stats.downloadRate}%</p>
                    <p className="text-xs text-amber-600/70">Download Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Certificate Types */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Certificate Types</CardTitle>
                <Badge variant="secondary">{certificateTypes.length} types</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {certificateTypes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No certificate types created yet</p>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                  {certificateTypes.map((ct) => {
                    const downloadPercent = ct.recipientsCount > 0 
                      ? Math.round((ct.downloadedCount / ct.recipientsCount) * 100) 
                      : 0
                    
                    return (
                      <div key={ct._id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{ct.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {ct.recipientsCount} recipients â€¢ {ct.downloadedCount} downloaded ({downloadPercent}%)
                            </p>
                          </div>
                        </div>
                        <Badge variant={ct.isActive ? "default" : "secondary"}>
                          {ct.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}


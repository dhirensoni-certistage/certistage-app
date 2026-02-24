"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"

export default function TestLinksPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/client/events")
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || [])
        }
      } catch (error) {
        console.error("Failed to fetch events:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${link}`)
    toast.success("Link copied!")
  }

  const openLink = (link: string) => {
    window.open(link, "_blank")
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Test Download Links</h1>
        <p className="text-muted-foreground">
          All valid download links for your events and certificate types
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No events found. Create an event first from the client dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        events.map((event) => (
          <Card key={event._id}>
            <CardHeader>
              <CardTitle>{event.name}</CardTitle>
              <p className="text-sm text-muted-foreground">Event ID: {event._id}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event-level link */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">📋 Event-Level Link (All Types)</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-background p-2 rounded border">
                    {`/download/${event._id}`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyLink(`/download/${event._id}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openLink(`/download/${event._id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Certificate type links */}
              {event.certificateTypes?.map((certType: any) => (
                <div key={certType._id} className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-3">
                  <p className="text-sm font-medium">🎓 {certType.name}</p>
                  <p className="text-xs text-muted-foreground">Type ID: {certType._id}</p>

                  {/* Type-level public search link */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Public Search Link:</p>
                    <div className="flex gap-2">
                      <code className="flex-1 text-xs bg-background p-2 rounded border">
                        {`/download/${event._id}/${certType._id}`}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyLink(`/download/${event._id}/${certType._id}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openLink(`/download/${event._id}/${certType._id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Individual certificate links (first 3 recipients) */}
                  {certType.recipients?.slice(0, 3).map((recipient: any) => (
                    <div key={recipient._id}>
                      <p className="text-xs text-muted-foreground mb-1">
                        Individual Link for: {recipient.name}
                      </p>
                      <div className="flex gap-2">
                        <code className="flex-1 text-xs bg-background p-2 rounded border">
                          {`/download?event=${event._id}&cert=${recipient.regNo || recipient._id}`}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyLink(`/download?event=${event._id}&cert=${recipient.regNo || recipient._id}`)
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openLink(`/download?event=${event._id}&cert=${recipient.regNo || recipient._id}`)
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {certType.recipients?.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      ... and {certType.recipients.length - 3} more recipients
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { getClientSession } from "@/lib/auth"
import {
  getDownloadLink, getCertTypePublicLink,
  type CertificateType
} from "@/lib/events"
import { ArrowLeft, Copy, Download, ExternalLink, Link as LinkIcon, Search, Share2 } from "lucide-react"
import { toast } from "sonner"
import { jsPDF } from "jspdf"

export default function CertTypeLinksPage() {
  const params = useParams()
  const router = useRouter()
  const typeId = params.typeId as string

  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventName, setEventName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const fetchEventData = async (eventId: string) => {
    try {
      const res = await fetch(`/api/client/dashboard?eventId=${eventId}`)
      if (res.ok) {
        const data = await res.json()
        setEventName(data.event.name)
        const type = data.event.certificateTypes.find((t: CertificateType) => t.id === typeId)
        setCertType(type || null)
      }
    } catch (error) {
      console.error("Failed to fetch event data:", error)
      toast.error("Failed to load data")
    }
    setIsLoading(false)
  }

  useEffect(() => {
    const session = getClientSession()
    if (session?.eventId) {
      setEventId(session.eventId)
      fetchEventData(session.eventId)
    } else {
      setIsLoading(false)
    }
  }, [typeId])

  const handleCopyPublicLink = () => {
    if (!eventId) return
    const link = `${window.location.origin}${getCertTypePublicLink(eventId, typeId)}`
    navigator.clipboard.writeText(link)
    toast.success("Public link copied!")
  }

  const handleCopyIndividualLink = (certId: string) => {
    if (!eventId) return
    const link = `${window.location.origin}${getDownloadLink(eventId, certId)}`
    navigator.clipboard.writeText(link)
    toast.success("Link copied!")
  }

  const handleCopyAllLinks = () => {
    if (!certType || !eventId) return
    const links = certType.recipients
      .map((r) => `${r.name}: ${window.location.origin}${getDownloadLink(eventId, r.certificateId)}`)
      .join("\n")
    navigator.clipboard.writeText(links)
    toast.success("All links copied!")
  }

  const handleDownloadPDF = async (recipientName: string, certId: string) => {
    if (!certType?.template) return

    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas error")

      const img = new Image()
      img.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = certType.template!
      })

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const textX = (certType.textPosition.x / 100) * canvas.width
      const textY = (certType.textPosition.y / 100) * canvas.height
      const fontSize = Math.round(canvas.height * 0.04)

      ctx.font = `600 ${fontSize}px sans-serif`
      ctx.fillStyle = "#000000"
      ctx.textAlign = certType.alignment || "center"
      ctx.textBaseline = "middle"
      ctx.fillText(recipientName, textX, textY)

      const pdfWidth = 297
      const pdfHeight = (canvas.height / canvas.width) * pdfWidth

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      })

      pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${certType.name}-${certId}.pdf`)
      toast.success("Downloaded!")
    } catch {
      toast.error("Download failed")
    }
  }

  const filteredRecipients = certType?.recipients.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.certificateId?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (isLoading) return <div className="p-6"><p className="text-muted-foreground">Loading...</p></div>
  if (!certType) return <div className="p-6"><p className="text-muted-foreground">Certificate type not found</p></div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/client/certificates/${typeId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{certType.name} - Download Links</h1>
          <p className="text-muted-foreground">{eventName}</p>
        </div>
      </div>

      {/* Public Link for this Certificate Type */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Public Download Link
          </CardTitle>
          <CardDescription>
            Share this link for "{certType.name}" certificates. Attendees verify with email/mobile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              readOnly
              value={
                eventId
                  ? `${typeof window !== 'undefined' ? window.location.origin : ''}${certType.shortCode ? `/d/${certType.shortCode}` : getCertTypePublicLink(eventId, typeId)}`
                  : ''
              }
              className="font-mono text-sm bg-background text-ellipsis"
            />
            <Button onClick={() => {
              if (!eventId) return
              const link = `${window.location.origin}${certType.shortCode ? `/d/${certType.shortCode}` : getCertTypePublicLink(eventId, typeId)}`
              navigator.clipboard.writeText(link)
              toast.success("Public link copied!")
            }}>
              <Copy className="h-4 w-4 mr-2" />Copy
            </Button>
            <Button variant="outline" onClick={() => {
              if (!eventId) return
              const path = certType.shortCode ? `/d/${certType.shortCode}` : getCertTypePublicLink(eventId, typeId)
              window.open(path, '_blank')
            }}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Links */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Individual Links</CardTitle>
              <CardDescription>Direct download links for each attendee</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-48" />
              </div>
              <Button variant="outline" onClick={handleCopyAllLinks}>
                <Copy className="h-4 w-4 mr-2" />Copy All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {certType.recipients.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Add attendees first to generate links</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Registration No</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Downloads</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipients.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{r.certificateId}</code></TableCell>
                      <TableCell>
                        <Badge variant={r.status === "downloaded" ? "default" : "outline"} className={r.status === "downloaded" ? "bg-emerald-500" : ""}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{r.downloadCount}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleCopyIndividualLink(r.certificateId)} title="Copy Link">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(r.name, r.certificateId)} title="Download PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

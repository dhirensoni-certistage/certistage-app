"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { getClientSession } from "@/lib/auth"
import { 
  ArrowLeft, Upload, Trash2, Move, AlignLeft, AlignCenter, AlignRight, Eye, Check, Loader2
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CertificateType {
  id: string
  name: string
  template?: string
  templateImage?: string
  textPosition: { x: number; y: number }
  alignment?: "left" | "center" | "right"
  stats: { total: number; downloaded: number; pending: number }
}

interface EventData {
  _id: string
  name: string
  certificateTypes: CertificateType[]
}

export default function CertificateTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const typeId = params.typeId as string

  const [event, setEvent] = useState<EventData | null>(null)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Template state
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // API helper to update certificate type
  const updateCertTypeAPI = async (updates: Record<string, unknown>) => {
    if (!userId || !typeId) return false
    try {
      const res = await fetch('/api/client/certificate-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, typeId, ...updates })
      })
      return res.ok
    } catch {
      return false
    }
  }

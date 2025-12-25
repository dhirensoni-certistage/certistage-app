"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Award, Download, Check, AlertCircle, Loader2, Search, User, 
  ArrowLeft, Shield, Sparkles, FileCheck, ChevronRight, Mail, Phone, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { jsPDF } from "jspdf"
import { cn } from "@/lib/utils"

type Step = "search" | "select" | "preview"

interface RecipientData {
  id: string
  name: string
  email: string
  mobile: string
  certificateId: string
}

interface CertTypeData {
  id: string
  name: string
  template: string
  textPosition: { x: number; y: number }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
  showNameField: boolean
  customFields?: any[]
  signatures?: any[]
}

interface MatchedCertificate {
  recipient: RecipientData
  certType: CertTypeData
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
}

export default function CertTypeDownloadPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const typeId = params.typeId as string

  const [loading, setLoading] = useState(true)
  const [eventName, setEventName] = useState("")
  const [currentCertType, setCurrentCertType] = useState<CertTypeData | null>(null)
  const [allCertTypes, setAllCertTypes] = useState<(CertTypeData & { recipients: RecipientData[] })[]>([])
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>("search")
  const [searchValue, setSearchValue] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  
  const [matchedCertificates, setMatchedCertificates] = useState<MatchedCertificate[]>([])
  const [selectedCertificate, setSelectedCertificate] = useState<MatchedCertificate | null>(null)
  
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // Security: Prevent right-click and keyboard shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === "s" || e.key === "p" || e.key === "u")) || e.key === "F12") {
        e.preventDefault()
      }
    }
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Fetch all certificate types for this event (for cross-type search)
  useEffect(() => {
    if (!eventId || !typeId) {
      setError("Invalid link")
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        // Fetch current certificate type data
        const res = await fetch(`/api/download?eventId=${eventId}&typeId=${typeId}`)
        const data = await res.json()
        
        if (!res.ok) {
          setError(data.error || "Failed to load")
          setLoading(false)
          return
        }

        if (!data.certificateType?.templateImage) {
          setError("Certificate template not available yet")
          setLoading(false)
          return
        }

        setEventName(data.event?.name || "")
        
        const currentType: CertTypeData & { recipients: RecipientData[] } = {
          id: data.certificateType.id,
          name: data.certificateType.name,
          template: data.certificateType.templateImage,
          textPosition: data.certificateType.textPosition || { x: 50, y: 60 },
          fontSize: data.certificateType.fontSize || 24,
          fontFamily: data.certificateType.fontFamily || "Arial",
          fontBold: data.certificateType.fontBold || false,
          fontItalic: data.certificateType.fontItalic || false,
          showNameField: data.certificateType.showNameField !== false,
          customFields: data.certificateType.customFields || [],
          signatures: data.certificateType.signatures || [],
          recipients: data.recipients || []
        }
        
        setCurrentCertType(currentType)
        setAllCertTypes([currentType])

        // Also fetch all other certificate types for this event (for cross-search)
        try {
          const allTypesRes = await fetch(`/api/download/all-types?eventId=${eventId}`)
          if (allTypesRes.ok) {
            const allTypesData = await allTypesRes.json()
            if (allTypesData.certificateTypes) {
              setAllCertTypes(allTypesData.certificateTypes)
            }
          }
        } catch {
          // If all-types API fails, just use current type
        }

        setLoading(false)
      } catch {
        setError("Failed to load certificate data")
        setLoading(false)
      }
    }
    fetchData()
  }, [eventId, typeId])

  // Search across ALL certificate types in this event
  const handleSearch = useCallback(() => {
    if (!searchValue.trim()) {
      toast.error("Please enter your email or mobile number")
      return
    }

    setIsSearching(true)
    
    setTimeout(() => {
      const searchLower = searchValue.toLowerCase().trim()
      const searchDigits = searchValue.replace(/[^0-9]/g, "")
      
      const matches: MatchedCertificate[] = []
      
      // Search across ALL certificate types
      for (const certType of allCertTypes) {
        for (const recipient of certType.recipients) {
          let isMatch = false
          
          // Email match
          if (recipient.email && recipient.email.toLowerCase() === searchLower) {
            isMatch = true
          }
          
          // Mobile match (last 10 digits)
          if (!isMatch && searchDigits.length >= 10) {
            const recipientDigits = (recipient.mobile || "").replace(/[^0-9]/g, "")
            const searchLast10 = searchDigits.slice(-10)
            const recipientLast10 = recipientDigits.slice(-10)
            if (searchLast10 === recipientLast10 && recipientLast10.length === 10) {
              isMatch = true
            }
          }
          
          if (isMatch) {
            matches.push({
              recipient: {
                id: recipient.id,
                name: recipient.name,
                email: recipient.email,
                mobile: recipient.mobile,
                certificateId: recipient.certificateId
              },
              certType: {
                id: certType.id,
                name: certType.name,
                template: certType.template,
                textPosition: certType.textPosition,
                fontSize: certType.fontSize,
                fontFamily: certType.fontFamily,
                fontBold: certType.fontBold,
                fontItalic: certType.fontItalic,
                showNameField: certType.showNameField,
                customFields: certType.customFields,
                signatures: certType.signatures
              }
            })
          }
        }
      }

      if (matches.length === 0) {
        toast.error("No certificate found with this email or mobile")
        setIsSearching(false)
        return
      }

      setMatchedCertificates(matches)
      
      if (matches.length === 1) {
        setSelectedCertificate(matches[0])
        setStep("preview")
      } else {
        setStep("select")
      }
      setIsSearching(false)
    }, 600)
  }, [searchValue, allCertTypes])

  const handleBack = () => {
    if (step === "preview" && matchedCertificates.length > 1) {
      setStep("select")
    } else {
      setStep("search")
      setSelectedCertificate(null)
      setMatchedCertificates([])
    }
    setDownloaded(false)
  }

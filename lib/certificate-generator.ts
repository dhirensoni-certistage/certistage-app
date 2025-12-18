import { jsPDF } from "jspdf"

export interface CertificateSettings {
  template: string
  textPosition: {
    x: number
    y: number
  }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
}

export interface SavedTemplate {
  id: string
  name: string
  template: string
  textPosition: {
    x: number
    y: number
  }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
  createdAt: string
  thumbnail?: string
}

export interface Recipient {
  id: string
  name: string
  email: string
  mobile: string
  certificateId: string
}

const TEMPLATES_KEY = "certificateTemplates"
const ACTIVE_TEMPLATE_KEY = "activeTemplateId"

// Get all saved templates
export function getSavedTemplates(): SavedTemplate[] {
  const templatesStr = localStorage.getItem(TEMPLATES_KEY)
  return templatesStr ? JSON.parse(templatesStr) : []
}

// Save a new template
export function saveTemplate(template: Omit<SavedTemplate, "id" | "createdAt">): SavedTemplate {
  const templates = getSavedTemplates()
  const newTemplate: SavedTemplate = {
    ...template,
    id: `template-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  templates.push(newTemplate)
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  return newTemplate
}

// Update an existing template
export function updateTemplate(id: string, updates: Partial<SavedTemplate>): SavedTemplate | null {
  const templates = getSavedTemplates()
  const index = templates.findIndex((t) => t.id === id)
  if (index === -1) return null
  
  templates[index] = { ...templates[index], ...updates }
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  return templates[index]
}

// Delete a template
export function deleteTemplate(id: string): boolean {
  const templates = getSavedTemplates()
  const filtered = templates.filter((t) => t.id !== id)
  if (filtered.length === templates.length) return false
  
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered))
  
  // Clear active template if it was deleted
  if (getActiveTemplateId() === id) {
    localStorage.removeItem(ACTIVE_TEMPLATE_KEY)
  }
  return true
}

// Get active template ID
export function getActiveTemplateId(): string | null {
  return localStorage.getItem(ACTIVE_TEMPLATE_KEY)
}

// Set active template
export function setActiveTemplate(id: string): void {
  localStorage.setItem(ACTIVE_TEMPLATE_KEY, id)
}

// Get active template settings
export function getActiveTemplate(): SavedTemplate | null {
  const activeId = getActiveTemplateId()
  if (!activeId) return null
  
  const templates = getSavedTemplates()
  return templates.find((t) => t.id === activeId) || null
}

// Legacy support - load certificate settings from old format or active template
export function loadCertificateSettings(): CertificateSettings | null {
  // First try to get active template
  const activeTemplate = getActiveTemplate()
  if (activeTemplate) {
    return {
      template: activeTemplate.template,
      textPosition: activeTemplate.textPosition,
      fontSize: activeTemplate.fontSize ?? 24,
      fontFamily: activeTemplate.fontFamily ?? "Arial",
      fontBold: activeTemplate.fontBold ?? false,
      fontItalic: activeTemplate.fontItalic ?? false,
    }
  }
  
  // Fallback to old format for backward compatibility
  const template = localStorage.getItem("certificateTemplate")
  const textSettingsStr = localStorage.getItem("certificateTextSettings")

  if (!template) return null

  const textSettings = textSettingsStr
    ? JSON.parse(textSettingsStr)
    : { position: { x: 50, y: 60 } }

  return {
    template,
    textPosition: textSettings.position,
    fontSize: 24,
    fontFamily: "Arial",
    fontBold: false,
    fontItalic: false,
  }
}

// Generate a single certificate PDF
export async function generateCertificatePDF(
  recipientName: string,
  settings: CertificateSettings
): Promise<Blob> {
  const { template, textPosition } = settings

  // Create canvas
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get canvas context")

  // Load template image
  const img = new Image()
  img.crossOrigin = "anonymous"

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = template
  })

  // Set canvas size
  canvas.width = img.width
  canvas.height = img.height

  // Draw template
  ctx.drawImage(img, 0, 0)

  // Calculate text position
  const textX = (textPosition.x / 100) * canvas.width
  const textY = (textPosition.y / 100) * canvas.height

  // Set text styles - scale fontSize based on canvas size
  const scaledFontSize = Math.round((settings.fontSize / 100) * canvas.height * 2.5)
  const fontWeight = settings.fontBold ? "bold" : "normal"
  const fontStyle = settings.fontItalic ? "italic" : "normal"
  const fontFamily = settings.fontFamily || "Arial"
  ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`
  ctx.fillStyle = "#000000"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  // Draw name
  ctx.fillText(recipientName, textX, textY)

  // Create PDF
  const imgWidth = canvas.width
  const imgHeight = canvas.height
  const pdfWidth = 297
  const pdfHeight = (imgHeight / imgWidth) * pdfWidth

  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
    unit: "mm",
    format: [pdfWidth, pdfHeight],
  })

  const imgData = canvas.toDataURL("image/jpeg", 1.0)
  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)

  return pdf.output("blob")
}

// Download a single certificate
export async function downloadCertificate(
  recipient: Recipient,
  settings: CertificateSettings
): Promise<void> {
  const blob = await generateCertificatePDF(recipient.name, settings)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `certificate-${recipient.certificateId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// Generate all certificates as a zip (requires jszip)
export async function downloadAllCertificates(
  recipients: Recipient[],
  settings: CertificateSettings,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  // For simplicity, download one by one with delay
  for (let i = 0; i < recipients.length; i++) {
    onProgress?.(i + 1, recipients.length)
    await downloadCertificate(recipients[i], settings)
    // Small delay between downloads
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

import { jsPDF } from "jspdf"
import { addonItemName } from "@/lib/addons"
import { getPlanById } from "@/lib/plan-config.server"
import { isOneTimePlan, planExpiryFrom, planTermLabel } from "@/lib/plan-config"
import { readFile } from "fs/promises"
import path from "path"

let cachedLogoDataUrl: string | null = null

function formatInr(paise: number) {
  return `Rs ${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function capitalize(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

async function getWebsiteLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl

  try {
    const logoPath = path.join(process.cwd(), "public", "Certistage_icon.svg")
    const svgBuffer = await readFile(logoPath)
    const sharpModule = await import("sharp")
    const sharp = sharpModule.default
    const pngBuffer = await sharp(svgBuffer)
      .resize(96, 96, { fit: "contain" })
      .png()
      .toBuffer()

    cachedLogoDataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`
    return cachedLogoDataUrl
  } catch (error) {
    console.error("Failed to load invoice logo:", error)
    return null
  }
}

function drawTextPair(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(label, x, y)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text(value, x + width, y, { align: "right" })
}

export interface InvoicePdfUser {
  name?: string
  email?: string
  phone?: string
  organization?: string
}

const planLabel = (name: string) => (/\bplan$/i.test(name.trim()) ? name.trim() : `${name.trim()} Plan`)

/**
 * The PDF payment receipt. Used for the download link, the Billing page and the
 * attachment on the receipt email. `planName` is the plan's display name from Admin > Plans.
 */
export async function renderInvoicePdf(payment: any, user: InvoicePdfUser | null, planName?: string): Promise<Buffer> {
  const customerOrganization = String(user?.organization || "").trim()
  const normalizedOrg = customerOrganization.toLowerCase()
  const showCustomerOrganization =
    customerOrganization.length > 0 &&
    normalizedOrg !== "certistage" &&
    normalizedOrg !== "certistage.com" &&
    normalizedOrg !== "certificate generation platform" &&
    normalizedOrg !== String(user?.name || "").trim().toLowerCase()
  const issuedAt = payment.invoiceIssuedAt || payment.createdAt || new Date()
  const planCfg = payment.kind === "addon" ? null : await getPlanById(String(payment.plan || ""))
  const validUntil = planExpiryFrom(planCfg, issuedAt)
  const oneTime = isOneTimePlan(planCfg)
  const baseAmount = payment.invoiceBaseAmount || payment.amount
  const gatewayFee =
    typeof payment.invoiceGatewayFee === "number"
      ? payment.invoiceGatewayFee
      : Math.max(0, payment.amount - baseAmount)
  const totalAmount = payment.amount
  const showGatewayFee =
    process.env.SHOW_GATEWAY_FEE_INVOICE === "true" && gatewayFee > 0
  const logoDataUrl = await getWebsiteLogoDataUrl()

  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // Top header
  doc.setFillColor(17, 17, 17)
  doc.roundedRect(margin, y, contentWidth, 110, 10, 10, "F")
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(margin + 18, y + 18, 34, 34, 8, 8, "F")
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin + 14, y + 14, 42, 42, undefined, "FAST")
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(17, 17, 17)
    doc.text("C", margin + 29, y + 41)
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text("CertiStage", margin + 66, y + 38)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(209, 213, 219)
  doc.text("Professional Certificate Issuing Platform", margin + 66, y + 56)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text("PAYMENT RECEIPT", pageWidth - margin - 16, y + 36, { align: "right" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`#${payment.invoiceNumber}`, pageWidth - margin - 16, y + 54, { align: "right" })

  // Paid badge
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(pageWidth - margin - 76, y + 68, 60, 20, 8, 8, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(17, 24, 39)
  doc.text("PAID", pageWidth - margin - 46, y + 81, { align: "center" })

  y += 132

  // Meta row (2-line layout to avoid overlap)
  drawTextPair(
    doc,
    "Invoice Date",
    new Date(issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    margin,
    y,
    140
  )
  drawTextPair(
    doc,
    "Valid Until",
    // Add-on emails never expire
    payment.kind === "addon" ? "No expiry" : new Date(validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    margin + 170,
    y,
    140
  )
  y += 20
  drawTextPair(doc, "Payment ID", payment.paymentId || "-", margin, y, contentWidth)

  y += 16
  doc.setDrawColor(229, 231, 235)
  doc.line(margin, y, pageWidth - margin, y)
  y += 22

  // From / Bill To cards
  const cardGap = 16
  const cardWidth = (contentWidth - cardGap) / 2
  const cardHeight = 110

  doc.setFillColor(249, 250, 251)
  doc.roundedRect(margin, y, cardWidth, cardHeight, 8, 8, "F")
  doc.roundedRect(margin + cardWidth + cardGap, y, cardWidth, cardHeight, 8, 8, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text("FROM", margin + 14, y + 20)
  doc.text("BILL TO", margin + cardWidth + cardGap + 14, y + 20)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("CertiStage", margin + 14, y + 38)
  doc.text("support@certistage.com", margin + 14, y + 54)
  doc.text("www.certistage.com", margin + 14, y + 70)

  const billToX = margin + cardWidth + cardGap + 14
  doc.text(user?.name || "Customer", billToX, y + 38)
  doc.text(user?.email || "-", billToX, y + 54)
  if (user?.phone) doc.text(String(user.phone), billToX, y + 70)
  if (showCustomerOrganization) doc.text(customerOrganization, billToX, y + 86)

  y += cardHeight + 22

  // Items table
  doc.setFillColor(243, 244, 246)
  doc.roundedRect(margin, y, contentWidth, 30, 6, 6, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(75, 85, 99)
  doc.text("DESCRIPTION", margin + 12, y + 19)
  doc.text("DURATION", margin + contentWidth - 150, y + 19)
  doc.text("AMOUNT", margin + contentWidth - 12, y + 19, { align: "right" })
  y += 46

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  const isAddon = payment.kind === "addon"
  doc.text(isAddon ? addonItemName(payment) : planLabel(planName || capitalize(payment.plan)), margin + 12, y)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(isAddon ? "Add-on - CertiStage" : oneTime ? "One-event plan - CertiStage" : "Annual Subscription - CertiStage", margin + 12, y + 14)
  doc.setTextColor(17, 24, 39)
  doc.text(isAddon ? "One-time" : planTermLabel(planCfg).replace(/^(\d+) year$/, "$1 Year"), margin + contentWidth - 150, y)
  doc.text(formatInr(baseAmount), margin + contentWidth - 12, y, { align: "right" })
  y += 28
  doc.setDrawColor(229, 231, 235)
  doc.line(margin, y, pageWidth - margin, y)
  y += 24

  // Totals card
  const totalCardX = margin + contentWidth - 250
  const totalCardW = 250
  const totalCardH = showGatewayFee ? 112 : 92
  doc.setFillColor(249, 250, 251)
  doc.roundedRect(totalCardX, y, totalCardW, totalCardH, 8, 8, "F")

  drawTextPair(doc, "Plan Amount", formatInr(baseAmount), totalCardX + 12, y + 24, totalCardW - 24)
  let totalY = y + 44
  if (showGatewayFee) {
    drawTextPair(
      doc,
      "Processing Fee",
      formatInr(gatewayFee),
      totalCardX + 12,
      totalY,
      totalCardW - 24
    )
    totalY += 20
  }
  doc.setDrawColor(229, 231, 235)
  doc.line(totalCardX + 12, totalY, totalCardX + totalCardW - 12, totalY)
  totalY += 20
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  doc.text("Total Paid", totalCardX + 12, totalY)
  doc.text(formatInr(totalAmount), totalCardX + totalCardW - 12, totalY, { align: "right" })

  y += totalCardH + 32

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text("Thank you for your purchase.", margin, y)
  y += 16
  doc.text(
    "This is a computer-generated receipt and does not require a signature.",
    margin,
    y
  )

  // Footer line
  doc.setDrawColor(229, 231, 235)
  doc.line(margin, pageHeight - 44, pageWidth - margin, pageHeight - 44)
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text("www.certistage.com", margin, pageHeight - 28)
  doc.text("support@certistage.com", pageWidth - margin, pageHeight - 28, {
    align: "right",
  })

  return Buffer.from(doc.output("arraybuffer"))
}

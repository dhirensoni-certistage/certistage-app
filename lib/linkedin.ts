// LinkedIn "Add to profile" is a plain URL, not an API: it opens the recipient's
// Licenses & certifications form with these fields already filled in.
// https://addtoprofile.linkedin.com

export interface LinkedInCertification {
  name: string              // certification name shown on the profile
  organizationName: string  // the issuing society / college / company, not CertiStage
  issuedAt?: string | Date  // issue month and year
  certUrl?: string          // where a viewer can see the certificate
  certId?: string           // credential ID, e.g. the registration number
}

export function buildLinkedInAddUrl(cert: LinkedInCertification): string {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: cert.name,
    organizationName: cert.organizationName,
  })

  const issued = cert.issuedAt ? new Date(cert.issuedAt) : null
  if (issued && !Number.isNaN(issued.getTime())) {
    params.set("issueYear", String(issued.getFullYear()))
    params.set("issueMonth", String(issued.getMonth() + 1))
  }
  if (cert.certUrl) params.set("certUrl", cert.certUrl)
  if (cert.certId) params.set("certId", cert.certId)

  return `https://www.linkedin.com/profile/add?${params.toString()}`
}

// Per-recipient public link (the same one organisers copy from the Links page),
// so a profile viewer lands on this person's certificate rather than a search page
export function individualCertificateUrl(origin: string, eventId: string, regNo: string): string {
  return `${origin}/download?event=${encodeURIComponent(eventId)}&cert=${encodeURIComponent(regNo)}`
}

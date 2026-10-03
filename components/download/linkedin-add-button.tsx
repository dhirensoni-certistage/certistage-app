"use client"

import { cn } from "@/lib/utils"
import { buildLinkedInAddUrl, type LinkedInCertification } from "@/lib/linkedin"

interface LinkedInAddButtonProps extends LinkedInCertification {
  recipientId?: string           // counts the click for the organiser's dashboard
  variant?: "solid" | "outline"  // outline next to Download; solid once the PDF is saved
  className?: string
}

// "Add to LinkedIn profile" link for the certificate download pages
export function LinkedInAddButton({ recipientId, variant = "solid", className, ...cert }: LinkedInAddButtonProps) {
  const recordClick = () => {
    if (!recipientId) return
    // keepalive: the request survives the tab switching to LinkedIn
    fetch("/api/download/linkedin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId }),
      keepalive: true
    }).catch(() => {})
  }

  return (
    <a
      href={buildLinkedInAddUrl(cert)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={recordClick}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors",
        variant === "solid"
          ? "text-white bg-[#0A66C2] hover:bg-[#004182]"
          : "text-[#0A66C2] bg-white border border-[#0A66C2]/40 hover:bg-[#0A66C2]/5 hover:border-[#0A66C2]",
        className
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
      </svg>
      Add to LinkedIn profile
    </a>
  )
}

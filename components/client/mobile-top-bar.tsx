"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { ClientSidebar } from "@/components/client/client-sidebar"
import { getClientSession } from "@/lib/auth"

/** Phone and tablet header for the client portal: brand, current event, and a drawer with the sidebar. */
export function MobileTopBar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [eventName, setEventName] = useState("")

  useEffect(() => {
    const session = getClientSession()
    setEventName(session?.eventId ? session.eventName || "" : "")
  }, [pathname])

  return (
    <header className="lg:hidden sticky top-0 z-40 h-14 shrink-0 bg-white border-b border-neutral-200 flex items-center justify-between px-4">
      <Link href="/client/events" className="flex items-center gap-2 min-w-0">
        <Image src="/Certistage_icon.svg" alt="CertiStage" width={28} height={28} />
        <span className="font-semibold text-[15px] text-black truncate">{eventName || "CertiStage"}</span>
      </Link>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 w-10 -mr-2 rounded-md flex items-center justify-center text-neutral-700 hover:bg-neutral-100"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] p-0 gap-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <ClientSidebar mobile onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}

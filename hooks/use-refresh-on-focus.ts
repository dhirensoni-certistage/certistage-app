"use client"

import { useEffect, useRef } from "react"

/**
 * Re-runs `refresh` when the tab regains focus or becomes visible again,
 * plus a slow safety interval. Replaces tight setInterval polling, which
 * kept hitting the API every few seconds while a page sat open.
 */
export function useRefreshOnFocus(refresh: () => void, intervalMs = 60_000, enabled = true) {
  const latest = useRef(refresh)
  latest.current = refresh

  useEffect(() => {
    if (!enabled) return
    let last = Date.now()
    const run = () => {
      // Skip if the last refresh was a moment ago (focus + visibility fire together)
      if (Date.now() - last < 2_000) return
      last = Date.now()
      latest.current()
    }
    const onVisible = () => { if (document.visibilityState === "visible") run() }
    window.addEventListener("focus", run)
    document.addEventListener("visibilitychange", onVisible)
    const timer = setInterval(() => { if (document.visibilityState === "visible") run() }, intervalMs)
    return () => {
      window.removeEventListener("focus", run)
      document.removeEventListener("visibilitychange", onVisible)
      clearInterval(timer)
    }
  }, [intervalMs, enabled])
}

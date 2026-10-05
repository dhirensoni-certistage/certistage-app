"use client"

import { useEffect, useState } from "react"
import { mergeAddonConfig, type AddonConfig } from "@/lib/addons"

const CACHE_KEY = "addon_config"

/** Pack quantities and prices as the admin saved them; starts from the cached copy or the defaults */
export function useAddonConfig(): AddonConfig {
  const [config, setConfig] = useState<AddonConfig>(() => mergeAddonConfig(null))

  useEffect(() => {
    let mounted = true
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) setConfig(mergeAddonConfig(JSON.parse(raw)))
    } catch {}
    fetch("/api/addon-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return
        setConfig(mergeAddonConfig(data))
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ emailPacks: data.emailPacks, certPacks: data.certPacks, emailRateTiers: data.emailRateTiers })) } catch {}
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  return config
}

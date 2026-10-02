"use client"

import { usePublicStats } from "@/hooks/use-public-stats"
import { formatApproxCount } from "@/lib/public-stats"

/** Four live counts from the platform. Skeletons until loaded; hidden if the API fails. */
export function LiveStatsStrip() {
  const stats = usePublicStats()
  const items = stats
    ? [
        { label: "Certificates issued", value: formatApproxCount(stats.certificates) },
        { label: "Certificates downloaded", value: formatApproxCount(stats.downloads) },
        { label: "Events powered", value: formatApproxCount(stats.events) },
        stats.organizations >= 10
          ? { label: "Organizations", value: formatApproxCount(stats.organizations) }
          : { label: "Certificate designs", value: formatApproxCount(stats.certificateTypes) }
      ]
    : [{ label: "Certificates issued" }, { label: "Certificates downloaded" }, { label: "Events powered" }, { label: "Certificate designs" }]

  return (
    <section className="py-12 border-y border-neutral-200 dark:border-neutral-800">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            {"value" in item && item.value ? (
              <p className="text-3xl md:text-4xl font-bold text-gold-deep dark:text-gold-light mb-1">{item.value}</p>
            ) : (
              <div className="h-9 md:h-10 w-24 mx-auto mb-1 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse" aria-label="Loading" />
            )}
            <p className="text-xs text-neutral-500 uppercase tracking-wide">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

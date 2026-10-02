"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

interface RevealProps {
  children: ReactNode
  className?: string
  /** seconds, for staggering siblings */
  delay?: number
  /** vertical offset in px before the element settles */
  y?: number
  /** fraction of the element that must be visible before it animates */
  amount?: number
}

/**
 * Fades and lifts content into place the first time it scrolls into view.
 * Kept subtle on purpose: small offset, short duration, ease-out curve.
 * Users who prefer reduced motion get the content with no movement.
 */
export function Reveal({ children, className, delay = 0, y = 20, amount = 0.2 }: RevealProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

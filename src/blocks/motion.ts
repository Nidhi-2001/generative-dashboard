// Shared motion for the dashboard's "assembly": blocks arrive one after another
// in reading order, charts start drawing as their card lands, and numbers count
// up. Motion here is wayfinding: it shows the dashboard was built for the question.
import { useReducedMotion } from 'framer-motion'
import { createContext, useContext } from 'react'

export const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Seconds before block `i` starts entering (after the summary line). */
export const blockDelay = (i: number) => 0.15 + i * 0.07

/** Delay (s) of the block currently rendering, so its contents can sync to it. */
export const BlockDelay = createContext(0)

/** Recharts animation props, timed to start as the card finishes arriving. */
export function useChartAnimation() {
  const delay = useContext(BlockDelay)
  const reduced = useReducedMotion()
  return {
    isAnimationActive: !reduced,
    animationBegin: Math.round((delay + 0.2) * 1000),
    animationDuration: 900,
    animationEasing: 'ease-out' as const,
  }
}

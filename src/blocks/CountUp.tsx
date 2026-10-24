import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useContext, useEffect } from 'react'
import { BlockDelay, EASE_OUT } from './motion'

/** Counts from 0 to `value` once the block has landed. */
export function CountUp({ value, format }: { value: number; format: (n: number, like: number) => string }) {
  const delay = useContext(BlockDelay)
  const reduced = useReducedMotion()
  const current = useMotionValue(reduced ? value : 0)
  const text = useTransform(current, (n) => format(n, value))

  useEffect(() => {
    if (reduced) {
      current.set(value)
      return
    }
    const controls = animate(current, value, { duration: 0.9, delay: delay + 0.1, ease: EASE_OUT })
    return () => controls.stop()
  }, [value, delay, reduced, current])

  return <motion.span>{text}</motion.span>
}

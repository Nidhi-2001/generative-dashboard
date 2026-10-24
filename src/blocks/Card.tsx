import type { ReactNode } from 'react'

const SPAN = { 1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3' } as const

export function Card({
  title,
  span,
  className = 'border-slate-800 bg-slate-900/60',
  children,
}: {
  title: string
  span: 1 | 2 | 3
  /** Border and background classes; defaults to the neutral card. */
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`${SPAN[span]} rounded-2xl border p-5 ${className}`}>
      <h3 className="mb-3 text-sm font-medium text-slate-400">{title}</h3>
      {children}
    </section>
  )
}

/** Shown when a source resolves to no rows (e.g. a month with no matching transactions). */
export function Empty() {
  return <p className="grid h-40 place-items-center text-sm text-slate-500">Nothing to show for this period.</p>
}

import type { ReactNode } from 'react'

const SPAN = { 1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3' } as const

export function Card({ title, span, children }: { title: string; span: 1 | 2 | 3; children: ReactNode }) {
  return (
    <section className={`${SPAN[span]} rounded-2xl border border-slate-800 bg-slate-900/60 p-5`}>
      <h3 className="mb-3 text-sm font-medium text-slate-400">{title}</h3>
      {children}
    </section>
  )
}

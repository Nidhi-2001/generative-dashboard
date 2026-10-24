import type { InsightBlock as InsightBlockType } from '../schema'
import { Card } from './Card'

const TONE = {
  neutral: { card: 'border-indigo-500/30 bg-indigo-500/5', dot: 'bg-indigo-400' },
  positive: { card: 'border-emerald-500/30 bg-emerald-500/5', dot: 'bg-emerald-400' },
  warning: { card: 'border-amber-500/30 bg-amber-500/5', dot: 'bg-amber-400' },
} as const

export function InsightBlock({ block }: { block: InsightBlockType }) {
  const tone = TONE[block.tone]
  return (
    <Card title={block.title} span={block.span} className={tone.card}>
      <p className="flex gap-3 text-base leading-relaxed text-slate-100">
        <span className={`mt-2.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
        {block.text}
      </p>
    </Card>
  )
}

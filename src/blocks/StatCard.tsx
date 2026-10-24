import { resolveMetric } from '../data/resolve'
import type { StatBlock } from '../schema'
import { Card } from './Card'
import { currency, percent } from './format'
import { CountUp } from './CountUp'

export function StatCard({ block }: { block: StatBlock }) {
  const { value, format, previous } = resolveMetric(block.metric)
  const show = format === 'percent' ? percent : currency

  let delta: string | undefined
  if (block.compare === 'previousMonth' && previous !== undefined && previous !== 0) {
    const change = format === 'percent' ? (value - previous) * 100 : ((value - previous) / previous) * 100
    const unit = format === 'percent' ? ' pts' : '%'
    delta = `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}${unit} vs last month`
  }

  return (
    <Card title={block.title}>
      <p className="text-3xl font-semibold tracking-tight text-slate-50 tabular-nums">
        <CountUp value={value} format={show} />
      </p>
      {delta && <p className="mt-1 text-xs text-slate-400">{delta}</p>}
    </Card>
  )
}

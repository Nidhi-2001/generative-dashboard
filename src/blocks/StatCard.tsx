import { resolveMetric } from '../data/resolve'
import type { Metric, StatBlock } from '../schema'
import { Card } from './Card'
import { CountUp } from './CountUp'
import { currency, percent } from './format'

// Whether a rise is good news, so the delta can say so. Typed against every
// metric kind: adding a metric to the schema fails the build until it's listed.
const HIGHER_IS_BETTER: Record<Metric['kind'], boolean> = {
  totalSpend: false,
  totalIncome: true,
  savingsRate: true,
  categorySpend: false,
  monthlySubscriptionCost: false,
  balance: true,
  balanceAfterPurchase: true,
  averageMonthlyNet: true,
}

export function StatCard({ block }: { block: StatBlock }) {
  const { value, format, previous } = resolveMetric(block.metric)
  const show = format === 'percent' ? percent : currency

  let delta: { text: string; label: string; good: boolean } | undefined
  if (block.compare === 'previousMonth' && previous !== undefined && previous !== 0) {
    const change = format === 'percent' ? (value - previous) * 100 : ((value - previous) / previous) * 100
    const amount = `${Math.abs(change).toFixed(1)}${format === 'percent' ? ' pts' : '%'}`
    delta = {
      text: `${change >= 0 ? '▲' : '▼'} ${amount}`,
      label: `${change >= 0 ? 'Up' : 'Down'} ${amount} vs last month`,
      good: change >= 0 === HIGHER_IS_BETTER[block.metric.kind],
    }
  }

  return (
    <Card title={block.title}>
      <p className="text-3xl font-semibold tracking-tight text-slate-50 tabular-nums">
        <CountUp value={value} format={show} />
      </p>
      {delta && (
        <p className="mt-2 text-xs" aria-label={delta.label}>
          <span
            className={`rounded-md px-1.5 py-0.5 font-medium tabular-nums ${
              delta.good ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
            }`}
          >
            {delta.text}
          </span>
          <span className="ml-1.5 text-slate-500">vs last month</span>
        </p>
      )}
    </Card>
  )
}

// Turns the references in a block (`source`, `metric`) into real numbers.
import type { Metric, Source } from '../schema'
import * as agg from './aggregates'
import type { Month } from './generate'

export type Row = Record<string, string | number>

export interface Dataset {
  rows: Row[]
  /** Key holding the category/x-axis label. */
  x: string
  /** Numeric keys to plot, in legend order. */
  series: string[]
}

export function resolveSource(source: Source): Dataset {
  switch (source.kind) {
    case 'categoryTotals':
      return { rows: agg.categoryTotals(source.month ?? agg.LATEST_MONTH), x: 'category', series: ['value'] }
    case 'monthlyTotals':
      return { rows: agg.monthlyTotals(), x: 'month', series: ['income', 'spend'] }
    case 'monthlyByCategory':
      return { rows: agg.monthlyByCategory(source.categories), x: 'month', series: source.categories }
    case 'topExpenses':
      return {
        rows: agg.topExpenses(source.limit, source.month, source.includeRecurring).map(({ merchant, date, category, amount }) => ({
          merchant,
          date,
          category,
          amount,
        })),
        x: 'merchant',
        series: ['amount'],
      }
    case 'subscriptions':
      return {
        rows: agg.subscriptions().map(({ merchant, amount }) => ({ merchant, amount })),
        x: 'merchant',
        series: ['amount'],
      }
  }
}

export interface MetricValue {
  value: number
  format: 'currency' | 'percent'
  /** Same metric one month earlier, when the metric is month-scoped and one exists. */
  previous?: number
}

export function resolveMetric(metric: Metric): MetricValue {
  switch (metric.kind) {
    case 'totalSpend':
      return monthly(metric.month, agg.totalSpend, 'currency')
    case 'totalIncome':
      return monthly(metric.month, agg.totalIncome, 'currency')
    case 'savingsRate':
      return monthly(metric.month, agg.savingsRate, 'percent')
    case 'categorySpend':
      return monthly(metric.month, (m) => agg.categorySpend(metric.category, m), 'currency')
    case 'monthlySubscriptionCost':
      return { value: agg.monthlySubscriptionCost(), format: 'currency' }
    case 'balance':
      return { value: agg.balance(), format: 'currency' }
  }
}

function monthly(month: Month | undefined, fn: (m: Month) => number, format: MetricValue['format']): MetricValue {
  const m = month ?? agg.LATEST_MONTH
  const prev = agg.previousMonth(m)
  return { value: fn(m), format, previous: prev && fn(prev) }
}

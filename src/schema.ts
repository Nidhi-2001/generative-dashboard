// The product. An Answer is a layout expressed as data: which blocks, in what order,
// reading which data. Blocks never carry numbers — they name a `source` or `metric`,
// and the resolver fills in real figures from the dataset. That way, whoever writes
// the JSON (the rule-based router today, an LLM tomorrow) can pick the layout but
// can't invent a dollar amount.
//
// Everything else derives from these zod schemas: TS types via z.infer, runtime
// validation via safeParse, and the JSON Schema for an LLM prompt via z.toJSONSchema.
import { z } from 'zod'
import { MONTHS } from './data/generate'

const Month = z.enum(MONTHS).describe('Calendar month, YYYY-MM. Omit for the latest month.')
const SpendCategory = z.enum(['housing', 'groceries', 'dining', 'transport', 'subscriptions'])

/** Tabular data a chart or table can read. */
export const Source = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('categoryTotals'), month: Month.optional() }).describe('Spend per category'),
  z.object({ kind: z.literal('monthlyTotals') }).describe('Income, spend and net for each of the six months'),
  z
    .object({ kind: z.literal('monthlyByCategory'), categories: z.array(SpendCategory).min(1) })
    .describe('Spend per month, one series per requested category'),
  z
    .object({
      kind: z.literal('topExpenses'),
      limit: z.number().int().min(1).max(20).default(5),
      month: Month.optional().describe('Calendar month, YYYY-MM. Omit for all six months.'),
      includeRecurring: z.boolean().default(false).describe('Include fixed bills like rent'),
    })
    .describe('Largest individual transactions'),
  z.object({ kind: z.literal('subscriptions') }).describe('Recurring subscription charges'),
])

/** A single number a stat card can show. */
export const Metric = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('totalSpend'), month: Month.optional() }),
  z.object({ kind: z.literal('totalIncome'), month: Month.optional() }),
  z.object({ kind: z.literal('savingsRate'), month: Month.optional() }),
  z.object({ kind: z.literal('categorySpend'), category: SpendCategory, month: Month.optional() }),
  z.object({ kind: z.literal('monthlySubscriptionCost') }),
  z.object({ kind: z.literal('balance') }).describe('Current checking balance'),
  z
    .object({ kind: z.literal('balanceAfterPurchase'), amount: z.number().positive() })
    .describe('Current balance minus a hypothetical purchase'),
  z.object({ kind: z.literal('averageMonthlyNet') }).describe('Average income minus spend per month'),
])

const base = {
  title: z.string().max(60),
  span: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1).describe('Columns to occupy in a 3-column grid'),
}

export const StatBlock = z.object({
  type: z.literal('stat'),
  ...base,
  metric: Metric,
  compare: z.literal('previousMonth').optional().describe('Show change vs the month before'),
})

export const BarBlock = z.object({
  type: z.literal('bar'),
  ...base,
  source: Source,
  orientation: z.enum(['vertical', 'horizontal']).default('vertical'),
})

export const LineBlock = z.object({
  type: z.literal('line'),
  ...base,
  source: Source,
})

export const DonutBlock = z.object({
  type: z.literal('donut'),
  ...base,
  source: Source,
})

export const TableBlock = z.object({
  type: z.literal('table'),
  ...base,
  source: Source,
})

export const InsightBlock = z.object({
  type: z.literal('insight'),
  ...base,
  // The one place prose lives. The router writes it from computed values; an LLM
  // path should do the same (compute first, then phrase) rather than trust model math.
  text: z.string().max(280),
  tone: z.enum(['neutral', 'positive', 'warning']).default('neutral'),
})

export const Block = z.discriminatedUnion('type', [StatBlock, BarBlock, LineBlock, DonutBlock, TableBlock, InsightBlock])

export const Answer = z.object({
  question: z.string(),
  summary: z.string().max(200).describe('One-sentence headline answer'),
  blocks: z.array(Block).min(1).max(8),
})

export type Source = z.infer<typeof Source>
export type Metric = z.infer<typeof Metric>
export type StatBlock = z.infer<typeof StatBlock>
export type BarBlock = z.infer<typeof BarBlock>
export type LineBlock = z.infer<typeof LineBlock>
export type DonutBlock = z.infer<typeof DonutBlock>
export type TableBlock = z.infer<typeof TableBlock>
export type InsightBlock = z.infer<typeof InsightBlock>
export type Block = z.infer<typeof Block>
export type BlockType = Block['type']
export type Answer = z.infer<typeof Answer>
/** What authors write: defaults (span, orientation, tone, limit) may be left out. */
export type AnswerInput = z.input<typeof Answer>

/** JSON Schema for the stretch-goal LLM prompt. */
export const answerJsonSchema = () => z.toJSONSchema(Answer, { io: 'input' })

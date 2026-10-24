// Rule-based router: question → intent → Answer.
//
// Parsing pulls out what the question mentions (categories, a month, a dollar
// amount), then the first matching intent builds the layout. Summaries and
// insight text are written from computed aggregates, never typed-in numbers,
// so this is also the reference for what an LLM-built Answer should look like.
import { currency, percent, titleCase } from './blocks/format'
import * as agg from './data/aggregates'
import { MONTHS, type Month, type SpendCategory } from './data/generate'
import type { AnswerInput } from './schema'

export interface Parsed {
  question: string
  text: string // lowercased
  categories: SpendCategory[]
  month?: Month
  amount?: number
}

type Blocks = AnswerInput['blocks']

interface Intent {
  id: string
  test: (p: Parsed) => boolean
  build: (p: Parsed) => { summary: string; blocks: Blocks }
}

// ── Parsing ────────────────────────────────────────────────────────────────

const CATEGORY_WORDS: Record<SpendCategory, RegExp> = {
  housing: /\b(housing|rent|utilities|utility|electric(ity)?|internet)\b/,
  groceries: /\b(grocer(y|ies)|supermarkets?)\b/,
  dining: /\b(dining|restaurants?|eating out|takeout|take-out)\b/,
  transport: /\b(transport(ation)?|uber|lyft|rides?|commut\w*|travel|flights?|mbta|train)\b/,
  subscriptions: /\b(subscriptions?|streaming|netflix|spotify)\b/,
}

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

function parseMonth(text: string): Month | undefined {
  if (/\blast month\b/.test(text)) return agg.previousMonth(agg.LATEST_MONTH)
  // Needs a preposition so "may I…" isn't read as May.
  const m = text.match(/\b(?:in|for|during|of|since)\s+([a-z]{3,9})\b/)
  if (!m) return undefined
  const i = MONTH_NAMES.findIndex((name) => name === m[1] || (m[1].length >= 3 && name.startsWith(m[1])))
  if (i < 0) return undefined
  const month = `2026-${String(i + 1).padStart(2, '0')}`
  return MONTHS.find((x) => x === month) // ignore months outside the dataset
}

function parseAmount(text: string): number | undefined {
  const m = text.match(/\$\s?(\d[\d,]*(?:\.\d{1,2})?)/) ?? text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\s?(?:dollars|bucks|usd)\b/) ?? text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\b/)
  const n = m ? Number(m[1].replace(/,/g, '')) : NaN
  return n > 0 ? n : undefined
}

export function parse(question: string): Parsed {
  const text = question.toLowerCase()
  return {
    question,
    text,
    // in the order the question mentions them, so "dining vs groceries" stays that way round
    categories: (Object.keys(CATEGORY_WORDS) as SpendCategory[])
      .map((c) => ({ c, at: text.search(CATEGORY_WORDS[c]) }))
      .filter(({ at }) => at >= 0)
      .sort((a, b) => a.at - b.at)
      .map(({ c }) => c),
    month: parseMonth(text),
    amount: parseAmount(text),
  }
}

// ── Helpers for computed copy ──────────────────────────────────────────────

const pctChange = (from: number, to: number) => (from === 0 ? 0 : (to - from) / from)
const signed = (r: number) => `${r >= 0 ? '+' : '−'}${Math.abs(r * 100).toFixed(0)}%`
const share = (part: number, whole: number) => `${Math.round((part / whole) * 100)}%`

/** Category with the largest relative change between two months. */
function biggestMover(from: Month, to: Month) {
  const cats: SpendCategory[] = ['housing', 'groceries', 'dining', 'transport', 'subscriptions']
  return cats
    .map((category) => {
      const a = agg.categorySpend(category, from)
      const b = agg.categorySpend(category, to)
      return { category, from: a, to: b, change: pctChange(a, b) }
    })
    .sort((x, y) => Math.abs(y.change) - Math.abs(x.change))[0]
}

// ── Intents (order matters: first match wins) ──────────────────────────────

const afford: Intent = {
  id: 'afford',
  test: (p) => /\bafford\b|\bcan i (buy|spend|get)\b/.test(p.text),
  build: (p) => {
    if (!p.amount) {
      return {
        summary: 'How much is it? Ask with an amount, like “Can I afford $400?”',
        blocks: [
          { type: 'stat', title: 'Balance', metric: { kind: 'balance' } },
          { type: 'stat', title: 'Saved per month (avg)', metric: { kind: 'averageMonthlyNet' } },
          { type: 'stat', title: 'Savings rate', metric: { kind: 'savingsRate' } },
        ],
      }
    }
    const amount = p.amount
    const after = agg.balance() - amount
    const net = agg.averageMonthlyNet()
    const monthsOfExpenses = after / agg.averageMonthlySpend()
    const ofSavings = amount <= net ? `${share(amount, net)} of what you save in a typical month` : `${(amount / net).toFixed(1)} months of savings`

    // Honest, simple rule: keep at least three months of expenses in checking.
    const { verdict, tone } =
      monthsOfExpenses >= 3
        ? { verdict: amount <= net ? 'Yes, comfortably.' : 'Yes, but it’s a big one.', tone: 'positive' as const }
        : monthsOfExpenses >= 1
          ? { verdict: 'You can, but it would leave a thin cushion.', tone: 'warning' as const }
          : { verdict: 'Not right now.', tone: 'warning' as const }

    return {
      summary: `${verdict} ${currency(amount)} is ${ofSavings}.`,
      blocks: [
        {
          type: 'insight',
          title: 'The math',
          span: 3,
          tone,
          text: `You save about ${currency(net)} a month. After a ${currency(amount)} purchase you’d have ${currency(after)} in checking, about ${monthsOfExpenses.toFixed(1)} months of expenses.`,
        },
        { type: 'stat', title: 'Balance now', metric: { kind: 'balance' } },
        { type: 'stat', title: 'Balance after purchase', metric: { kind: 'balanceAfterPurchase', amount } },
        { type: 'stat', title: 'Saved per month (avg)', metric: { kind: 'averageMonthlyNet' } },
      ],
    }
  },
}

function compareBuild(categories: SpendCategory[]): ReturnType<Intent['build']> {
  const month = agg.LATEST_MONTH
  const sixMonth = categories.map((c) => ({ c, total: agg.categorySpend(c) })).sort((a, b) => b.total - a.total)
  const [hi, lo] = sixMonth
  const names = categories.join(' vs ')
  const stats: Blocks = categories.slice(0, 3).map((category) => ({
    type: 'stat',
    title: `${titleCase(category)} in ${agg.monthName(month)}`,
    metric: { kind: 'categorySpend', category, month },
    compare: 'previousMonth',
  }))
  // Fills the third column when exactly two categories are compared.
  const gap: Blocks =
    categories.length === 2
      ? [{ type: 'insight', title: 'Gap', text: `${titleCase(hi.c)} ran ${currency((hi.total - lo.total) / MONTHS.length)} a month higher on average.` }]
      : []
  return {
    summary: `Over six months you spent ${currency(hi.total)} on ${hi.c} and ${currency(lo.total)} on ${lo.c}.`,
    blocks: [...stats, ...gap, { type: 'bar', title: `${titleCase(names)}, by month`, span: 3, source: { kind: 'monthlyByCategory', categories } }],
  }
}

const compareCategories: Intent = {
  id: 'compare',
  test: (p) => p.categories.length >= 2,
  build: (p) => compareBuild(p.categories),
}

const subscriptions: Intent = {
  id: 'subscriptions',
  test: (p) => /\b(subscri\w*|recurring|streaming)\b/.test(p.text),
  build: () => {
    const monthly = agg.monthlySubscriptionCost()
    const count = agg.subscriptions().length
    const added = agg.newSubscriptions()
    const text = added.length
      ? `${added.map((t) => `${t.merchant} started in ${agg.monthName(t.date.slice(0, 7) as Month)}`).join(', ')}, adding ${currency(added.reduce((s, t) => s + t.amount, 0))} a month. All ${count} together cost ${currency(monthly * 12)} a year.`
      : `All ${count} together cost ${currency(monthly * 12)} a year.`
    return {
      summary: `You pay ${currency(monthly)} a month across ${count} subscriptions.`,
      blocks: [
        { type: 'stat', title: 'Per month', metric: { kind: 'monthlySubscriptionCost' } },
        { type: 'insight', title: added.length ? 'New this period' : 'Per year', span: 2, tone: added.length ? 'warning' : 'neutral', text },
        { type: 'table', title: 'Recurring charges', span: 3, source: { kind: 'subscriptions' } },
      ],
    }
  },
}

const savings: Intent = {
  id: 'savings',
  test: (p) => /\bsav(e|es|ed|ing|ings)\b/.test(p.text),
  build: (p) => {
    const month = p.month ?? agg.LATEST_MONTH
    const low = [...MONTHS].sort((a, b) => agg.savingsRate(a) - agg.savingsRate(b))[0]
    const culprit = agg.topExpenses(1, low)[0]
    return {
      summary: `You saved ${percent(agg.savingsRate(month))} of your income in ${agg.monthName(month)}.`,
      blocks: [
        { type: 'stat', title: 'Savings rate', metric: { kind: 'savingsRate', month }, compare: 'previousMonth' },
        { type: 'stat', title: 'Income', metric: { kind: 'totalIncome', month } },
        { type: 'stat', title: 'Spending', metric: { kind: 'totalSpend', month }, compare: 'previousMonth' },
        { type: 'line', title: 'Income vs spending', span: 2, source: { kind: 'monthlyTotals' } },
        {
          type: 'insight',
          title: 'Low point',
          tone: 'warning',
          text: `${agg.monthName(low)} was your lowest month at ${percent(agg.savingsRate(low))}${culprit ? `, driven by ${culprit.merchant} (${currency(culprit.amount)})` : ''}.`,
        },
      ],
    }
  },
}

const biggest: Intent = {
  id: 'biggest',
  test: (p) => /\b(biggest|largest|top|most expensive|priciest)\b/.test(p.text),
  build: (p) => {
    const top = agg.topExpenses(1, p.month)[0]
    const [fixed] = agg.topExpenses(1, agg.LATEST_MONTH, true)
    const when = p.month ? `in ${agg.monthName(p.month)}` : 'over six months'
    return {
      summary: `Your largest one-off ${when} was ${top.merchant} at ${currency(top.amount)}.`,
      blocks: [
        { type: 'table', title: 'Largest expenses', span: 2, source: { kind: 'topExpenses', limit: 8, month: p.month } },
        { type: 'bar', title: 'Top 5', orientation: 'horizontal', source: { kind: 'topExpenses', limit: 5, month: p.month } },
        {
          type: 'insight',
          title: 'Not shown',
          span: 3,
          text: `Fixed bills are left out. The largest, ${fixed.merchant}, is ${currency(fixed.amount)} a month; ask about housing to see it.`,
        },
      ],
    }
  },
}

const trend: Intent = {
  id: 'trend',
  test: (p) =>
    /\b(chang\w*|trends?|over time|history|month[- ]over[- ]month|over (the )?(last |past )?\d+ months|grow\w*|increas\w*|decreas\w*)\b/.test(p.text),
  build: () => {
    const [first, last] = [MONTHS[0], agg.LATEST_MONTH]
    const from = agg.totalSpend(first)
    const to = agg.totalSpend(last)
    const mover = biggestMover(first, last)
    return {
      summary: `Spending went from ${currency(from)} in ${agg.monthName(first)} to ${currency(to)} in ${agg.monthName(last)} (${signed(pctChange(from, to))}).`,
      blocks: [
        {
          type: 'line',
          title: 'Spending by category',
          span: 3,
          source: { kind: 'monthlyByCategory', categories: ['housing', 'groceries', 'dining', 'transport', 'subscriptions'] },
        },
        { type: 'stat', title: `Spent in ${agg.monthName(last)}`, metric: { kind: 'totalSpend' }, compare: 'previousMonth' },
        {
          type: 'insight',
          title: 'Biggest mover',
          span: 2,
          tone: mover.change > 0 ? 'warning' : 'positive',
          text: `${titleCase(mover.category)} moved the most: ${currency(mover.from)} in ${agg.monthName(first)} → ${currency(mover.to)} in ${agg.monthName(last)} (${signed(mover.change)}).`,
        },
      ],
    }
  },
}

const breakdown: Intent = {
  id: 'breakdown',
  test: (p) =>
    /\bwhere\b.*\b(go|goes|went|spent|spend)\b|\bbreak ?down\b|\bcategor\w*\b|\bspend(ing)? (by|on what)\b|\bwhat did i spend\b/.test(p.text),
  build: (p) => {
    const month = p.month ?? agg.LATEST_MONTH
    const total = agg.totalSpend(month)
    const [top] = agg.categoryTotals(month)
    const prev = agg.previousMonth(month)
    const mover = prev && biggestMover(prev, month)
    return {
      summary: `You spent ${currency(total)} in ${agg.monthName(month)}, ${share(top.value, total)} of it on ${top.category}.`,
      blocks: [
        { type: 'stat', title: 'Total spent', metric: { kind: 'totalSpend', month }, compare: 'previousMonth' },
        { type: 'stat', title: `Top: ${titleCase(top.category)}`, metric: { kind: 'categorySpend', category: top.category, month }, compare: 'previousMonth' },
        { type: 'stat', title: 'Savings rate', metric: { kind: 'savingsRate', month } },
        { type: 'donut', title: 'Where it went', span: 2, source: { kind: 'categoryTotals', month } },
        mover
          ? {
              type: 'insight',
              title: `vs ${agg.monthName(prev)}`,
              tone: mover.change > 0 ? 'warning' : 'positive',
              text: `${titleCase(mover.category)} changed the most: ${signed(mover.change)} (${currency(mover.from)} → ${currency(mover.to)}).`,
            }
          : { type: 'insight', title: 'First month', text: 'This is the first month of data, so there’s nothing to compare against yet.' },
      ],
    }
  },
}

// "compare…" without two named categories: default to the most interesting pair.
const compareDefault: Intent = {
  id: 'compare',
  test: (p) => /\b(compare|comparison|vs\.?|versus)\b/.test(p.text),
  build: () => compareBuild(['dining', 'groceries']),
}

const category: Intent = {
  id: 'category',
  test: (p) => p.categories.length === 1,
  build: (p) => {
    const [c] = p.categories
    const month = p.month ?? agg.LATEST_MONTH
    const spend = agg.categorySpend(c, month)
    const prev = agg.previousMonth(month)
    const vs = prev ? `, ${signed(pctChange(agg.categorySpend(c, prev), spend))} vs ${agg.monthName(prev)}` : ''
    return {
      summary: `You spent ${currency(spend)} on ${c} in ${agg.monthName(month)}${vs}.`,
      blocks: [
        { type: 'stat', title: titleCase(c), metric: { kind: 'categorySpend', category: c, month }, compare: 'previousMonth' },
        {
          type: 'insight',
          title: 'Share of spending',
          span: 2,
          text: `${titleCase(c)} was ${share(spend, agg.totalSpend(month))} of everything you spent in ${agg.monthName(month)}, and ${currency(agg.categorySpend(c))} over six months.`,
        },
        { type: 'line', title: `${titleCase(c)} by month`, span: 3, source: { kind: 'monthlyByCategory', categories: [c] } },
      ],
    }
  },
}

// Specific beats general: a named category ("how has dining changed") wins over
// the whole-budget trend/breakdown views, and "compare" alone is a last resort.
const INTENTS: Intent[] = [afford, compareCategories, subscriptions, savings, biggest, category, trend, breakdown, compareDefault]

function overview(p: Parsed): ReturnType<Intent['build']> {
  return {
    summary: `I don’t have a specific view for that yet, so here’s your overview for ${agg.monthName(agg.LATEST_MONTH)}.`,
    blocks: [
      { type: 'stat', title: 'Spent this month', metric: { kind: 'totalSpend' }, compare: 'previousMonth' },
      { type: 'stat', title: 'Savings rate', metric: { kind: 'savingsRate' }, compare: 'previousMonth' },
      { type: 'stat', title: 'Balance', metric: { kind: 'balance' } },
      { type: 'line', title: 'Income vs spending', span: 2, source: { kind: 'monthlyTotals' } },
      { type: 'bar', title: 'By category', orientation: 'horizontal', source: { kind: 'categoryTotals' } },
      {
        type: 'insight',
        title: 'Try asking',
        span: 3,
        text: p.text.trim()
          ? 'Ask about subscriptions, your savings rate, your biggest expenses, or compare two categories like dining vs groceries.'
          : 'Ask a question about your money to build a dashboard for it.',
      },
    ],
  }
}

export function route(question: string): { intent: string; answer: AnswerInput } {
  const p = parse(question)
  const intent = INTENTS.find((i) => i.test(p))
  const built = intent ? intent.build(p) : overview(p)
  return { intent: intent?.id ?? 'overview', answer: { question, ...built } }
}

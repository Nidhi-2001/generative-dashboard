// The facts the model may cite. Everything an LLM-written summary or insight says
// with a number must come from here (see grounding.ts), so the digest carries the
// derived values a sentence would naturally use: shares, changes, averages.
import * as agg from '../data/aggregates'
import { MONTHS, type SpendCategory } from '../data/generate'

const CATEGORIES: SpendCategory[] = ['housing', 'groceries', 'dining', 'transport', 'subscriptions']
const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp
const pct = (n: number) => round(n * 100, 1)
const change = (from: number, to: number) => (from === 0 ? 0 : pct((to - from) / from))

export function buildFacts() {
  const latest = agg.LATEST_MONTH
  const prev = agg.previousMonth(latest)!
  const first = MONTHS[0]
  const latestSpend = agg.totalSpend(latest)

  return {
    window: `${agg.monthName(first)}–${agg.monthName(latest)} 2026 (six full months; "this month" = ${agg.monthName(latest)})`,
    months: MONTHS.map((m) => ({
      month: m,
      name: agg.monthName(m),
      income: agg.totalIncome(m),
      spend: agg.totalSpend(m),
      net: round(agg.totalIncome(m) - agg.totalSpend(m)),
      savingsRatePct: pct(agg.savingsRate(m)),
      byCategory: Object.fromEntries(CATEGORIES.map((c) => [c, agg.categorySpend(c, m)])),
      sharePctByCategory: Object.fromEntries(
        CATEGORIES.map((c) => [c, pct(agg.categorySpend(c, m) / agg.totalSpend(m))]),
      ),
    })),
    latestMonth: {
      month: latest, // shares for it are in months[]
      changePctVsPreviousMonth: {
        totalSpend: change(agg.totalSpend(prev), latestSpend),
        savingsRatePoints: round(pct(agg.savingsRate(latest)) - pct(agg.savingsRate(prev)), 1),
        ...Object.fromEntries(
          CATEGORIES.map((c) => [c, change(agg.categorySpend(c, prev), agg.categorySpend(c, latest))]),
        ),
      },
    },
    sixMonths: {
      totalSpend: agg.totalSpend(),
      totalIncome: agg.totalIncome(),
      byCategory: Object.fromEntries(CATEGORIES.map((c) => [c, agg.categorySpend(c)])),
      averageMonthlyByCategory: Object.fromEntries(
        CATEGORIES.map((c) => [c, round(agg.categorySpend(c) / MONTHS.length)]),
      ),
      changePctFirstToLatestMonth: {
        totalSpend: change(agg.totalSpend(first), latestSpend),
        ...Object.fromEntries(
          CATEGORIES.map((c) => [c, change(agg.categorySpend(c, first), agg.categorySpend(c, latest))]),
        ),
      },
    },
    balance: agg.balance(),
    averageMonthlyNet: agg.averageMonthlyNet(),
    averageMonthlySpend: agg.averageMonthlySpend(),
    fixedMonthlyBills: agg
      .topExpenses(20, latest, true)
      .filter((t) => t.recurring && t.category !== 'subscriptions')
      .map(({ merchant, category, amount }) => ({ merchant, category, amount })),
    topOneOffExpenses: agg
      .topExpenses(8)
      .map(({ date, merchant, category, amount }) => ({ date, merchant, category, amount })),
    subscriptions: {
      monthlyCost: agg.monthlySubscriptionCost(),
      yearlyCost: round(agg.monthlySubscriptionCost() * 12),
      items: agg.subscriptions().map(({ merchant, amount }) => ({ merchant, amount })),
      startedDuringWindow: agg
        .newSubscriptions()
        .map(({ merchant, date, amount }) => ({ merchant, firstCharge: date, amount })),
    },
  }
}

export type Facts = ReturnType<typeof buildFacts>

/** Facts that depend on the question itself: the math for "can I afford $X?". */
export function buildQuestionFacts(amount: number | undefined) {
  if (!amount) return undefined
  const after = round(agg.balance() - amount)
  return {
    purchase: {
      amount,
      balanceAfter: after,
      pctOfAverageMonthlySavings: pct(amount / agg.averageMonthlyNet()),
      monthsOfSavings: round(amount / agg.averageMonthlyNet(), 1),
      monthsOfExpensesLeftAfter: round(after / agg.averageMonthlySpend(), 1),
    },
  }
}

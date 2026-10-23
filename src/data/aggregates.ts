// Derived views over the transaction list. Everything the UI shows comes from here,
// never from numbers written into an Answer.
import { MONTHS, OPENING_BALANCE, transactions, type Month, type SpendCategory, type Transaction } from './generate'

export const LATEST_MONTH: Month = MONTHS[MONTHS.length - 1]

const inMonth = (month?: Month) => (t: Transaction) => !month || t.date.startsWith(month)
const isSpend = (t: Transaction) => t.category !== 'income'
const sum = (ts: Transaction[]) => Math.round(ts.reduce((acc, t) => acc + t.amount, 0) * 100) / 100

export function previousMonth(month: Month): Month | undefined {
  const i = MONTHS.indexOf(month)
  return i > 0 ? MONTHS[i - 1] : undefined
}

export function monthLabel(month: Month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' })
}

export const totalSpend = (month?: Month) => sum(transactions.filter(inMonth(month)).filter(isSpend))

export const totalIncome = (month?: Month) =>
  sum(transactions.filter(inMonth(month)).filter((t) => t.category === 'income'))

export const categorySpend = (category: SpendCategory, month?: Month) =>
  sum(transactions.filter(inMonth(month)).filter((t) => t.category === category))

export function savingsRate(month?: Month) {
  const income = totalIncome(month)
  return income === 0 ? 0 : (income - totalSpend(month)) / income
}

export const balance = () => Math.round((OPENING_BALANCE + totalIncome() - totalSpend()) * 100) / 100

export function categoryTotals(month?: Month) {
  const totals = new Map<SpendCategory, number>()
  for (const t of transactions.filter(inMonth(month)).filter(isSpend)) {
    const c = t.category as SpendCategory
    totals.set(c, (totals.get(c) ?? 0) + t.amount)
  }
  return [...totals]
    .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export const monthlyTotals = () =>
  MONTHS.map((month) => ({
    month: monthLabel(month),
    income: totalIncome(month),
    spend: totalSpend(month),
    net: Math.round((totalIncome(month) - totalSpend(month)) * 100) / 100,
  }))

export const monthlyByCategory = (categories: SpendCategory[]) =>
  MONTHS.map((month) => ({
    month: monthLabel(month),
    ...Object.fromEntries(categories.map((c) => [c, categorySpend(c, month)])),
  }))

export const topExpenses = (limit: number, month?: Month, includeRecurring = false) =>
  transactions
    .filter(inMonth(month))
    .filter(isSpend)
    .filter((t) => includeRecurring || !t.recurring)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)

/** One row per recurring subscription, priced at its latest charge. */
export function subscriptions() {
  const latest = new Map<string, Transaction>()
  for (const t of transactions) if (t.category === 'subscriptions') latest.set(t.merchant, t)
  return [...latest.values()].sort((a, b) => b.amount - a.amount)
}

export const monthlySubscriptionCost = () =>
  Math.round(subscriptions().reduce((acc, t) => acc + t.amount, 0) * 100) / 100

// Seeded synthetic dataset: six full months of transactions, identical on every run.
// The window ends on a fixed, complete month so "this month" never means a partial one.

export const CATEGORIES = ['income', 'housing', 'groceries', 'dining', 'transport', 'subscriptions'] as const
export type Category = (typeof CATEGORIES)[number]
export type SpendCategory = Exclude<Category, 'income'>

export const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'] as const
export type Month = (typeof MONTHS)[number]

export const OPENING_BALANCE = 4200 // checking balance on Apr 1

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  merchant: string
  category: Category
  amount: number // always positive; category says whether it's money in or out
  recurring: boolean
}

// mulberry32: tiny, fast, good enough for demo data
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SUBSCRIPTIONS: { merchant: string; amount: number; day: number; from?: Month }[] = [
  { merchant: 'Spotify', amount: 11.99, day: 3 },
  { merchant: 'Netflix', amount: 15.49, day: 8 },
  { merchant: 'iCloud+', amount: 2.99, day: 12 },
  { merchant: 'Planet Fitness', amount: 24.99, day: 17 },
  { merchant: 'Notion', amount: 10, day: 21 },
  { merchant: 'Max', amount: 16.99, day: 9, from: '2026-07' }, // new mid-window: something for an insight to notice
]

const GROCERS = ["Trader Joe's", 'Star Market', 'Whole Foods', 'H Mart']
const RESTAURANTS = ['Sweetgreen', 'Tatte', 'Chipotle', 'Pho Basil', 'Flour Bakery', 'Night Shift', 'Shake Shack']

export function generateTransactions(seed = 20261024): Transaction[] {
  const rand = rng(seed)
  const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 100) / 100
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)]

  const txns: Transaction[] = []
  MONTHS.forEach((month, i) => {
    const [y, m] = month.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const add = (day: number, merchant: string, category: Category, amount: number, recurring = false) =>
      txns.push({
        id: `${month}-${txns.length}`,
        date: `${month}-${String(day).padStart(2, '0')}`,
        merchant,
        category,
        amount,
        recurring,
      })
    const randomDay = () => 1 + Math.floor(rand() * daysInMonth)

    add(1, 'Northwind Payroll', 'income', 2450, true)
    add(15, 'Northwind Payroll', 'income', 2450, true)
    if (rand() < 0.5) add(randomDay(), 'Freelance design', 'income', between(150, 600))

    add(1, 'Rent — Beacon Mgmt', 'housing', 1650, true)
    add(10, 'Eversource', 'housing', between(70, 140), true)
    add(14, 'Xfinity', 'housing', 65, true)

    const trips = 7 + Math.floor(rand() * 3)
    for (let t = 0; t < trips; t++) add(randomDay(), pick(GROCERS), 'groceries', between(28, 115))

    // dining creeps up ~7% a month, so the 6-month trend has a story
    const meals = 8 + Math.floor(rand() * 5) + Math.floor(i / 2)
    for (let t = 0; t < meals; t++) add(randomDay(), pick(RESTAURANTS), 'dining', between(12, 64) * (1 + 0.07 * i))

    add(1, 'MBTA Monthly Pass', 'transport', 90, true)
    const rides = 2 + Math.floor(rand() * 4)
    for (let t = 0; t < rides; t++) add(randomDay(), rand() < 0.5 ? 'Uber' : 'Lyft', 'transport', between(11, 34))

    for (const sub of SUBSCRIPTIONS) {
      if (!sub.from || month >= sub.from) add(sub.day, sub.merchant, 'subscriptions', sub.amount, true)
    }

    // one-offs so "biggest expenses" isn't just rent
    if (month === '2026-06') add(19, 'JetBlue — BOS→SFO', 'transport', 386.4)
    if (month === '2026-08') add(23, 'IKEA', 'housing', 540.25)
  })

  for (const t of txns) t.amount = Math.round(t.amount * 100) / 100
  return txns.sort((a, b) => a.date.localeCompare(b.date))
}

export const transactions = generateTransactions()

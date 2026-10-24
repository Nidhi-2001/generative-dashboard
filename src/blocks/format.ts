const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' })

/** Cents only for small amounts. `like` picks the precision, so a count-up toward
 * $3,171 doesn't show cents on its way through $0–$99. */
export const currency = (n: number, like = n) => (Math.abs(like) < 100 ? usdCents : usd).format(n)
export const compactCurrency = (n: number) => usdCompact.format(n)
export const percent = (n: number) => `${(n * 100).toFixed(1)}%`
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export function shortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

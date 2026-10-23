const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' })

export const currency = (n: number) => (Math.abs(n) < 100 ? usdCents : usd).format(n)
export const compactCurrency = (n: number) => usdCompact.format(n)
export const percent = (n: number) => `${(n * 100).toFixed(1)}%`
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

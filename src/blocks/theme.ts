// Fixed color per series key, so "dining" is the same color on every dashboard.
// Categorical slots 1–5 of the dataviz reference palette (dark steps), in a fixed
// order; income/spend take slots 6–7 so they never share a hue with a category.
// Validated on the card surface (#0a1022): adjacent CVD ΔE ≥ 8.4, normal-vision ΔE ≥ 19.3.
export const SERIES_COLORS: Record<string, string> = {
  housing: '#3987e5',
  groceries: '#d95926',
  dining: '#199e70',
  transport: '#c98500',
  subscriptions: '#d55181',
  income: '#008300',
  spend: '#9085e9',
  net: '#94a3b8',
}
export const DEFAULT_COLOR = '#3987e5'
export const colorFor = (key: string) => SERIES_COLORS[key] ?? DEFAULT_COLOR

export const AXIS = { stroke: '#64748b', fontSize: 12, tickLine: false, axisLine: false } as const
export const GRID = '#1e293b'
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 10,
    fontSize: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  labelStyle: { color: '#e2e8f0', fontWeight: 500, marginBottom: 2 },
  itemStyle: { color: '#cbd5e1' },
  cursor: { fill: 'rgba(148,163,184,0.08)', stroke: '#475569' },
} as const

/** Legend labels wear text ink; the swatch beside them carries the series color. */
export const LEGEND_PROPS = {
  iconType: 'circle',
  iconSize: 8,
  itemSorter: null, // keep series order (Recharts sorts alphabetically by default)
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
} as const

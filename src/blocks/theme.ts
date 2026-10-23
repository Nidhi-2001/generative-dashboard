// Fixed color per series key, so "dining" is the same color on every dashboard.
export const SERIES_COLORS: Record<string, string> = {
  income: '#3ecf8e',
  spend: '#7c8cff',
  net: '#94a3b8',
  housing: '#7c8cff',
  groceries: '#3ecf8e',
  dining: '#f5a524',
  transport: '#38bdf8',
  subscriptions: '#e879f9',
}
export const DEFAULT_COLOR = '#7c8cff'
export const colorFor = (key: string) => SERIES_COLORS[key] ?? DEFAULT_COLOR

export const AXIS = { stroke: '#475569', fontSize: 12, tickLine: false, axisLine: false } as const
export const GRID = '#1e293b'
export const TOOLTIP_STYLE = {
  contentStyle: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#cbd5e1' },
  cursor: { fill: 'rgba(148,163,184,0.08)' },
} as const

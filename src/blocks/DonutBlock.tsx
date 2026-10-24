import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { resolveSource } from '../data/resolve'
import type { DonutBlock as DonutBlockType } from '../schema'
import { Card, Empty } from './Card'
import { currency, titleCase } from './format'
import { colorFor, TOOLTIP_STYLE } from './theme'

export function DonutBlock({ block }: { block: DonutBlockType }) {
  const { rows, x, series } = resolveSource(block.source)
  // A donut shows one series: parts of a whole.
  const key = series[0]
  const total = rows.reduce((sum, row) => sum + Number(row[key]), 0)

  if (!rows.length || total === 0) {
    return (
      <Card title={block.title} span={block.span}>
        <Empty />
      </Card>
    )
  }

  return (
    <Card title={block.title} span={block.span}>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative h-56 w-56 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={rows} dataKey={key} nameKey={x} innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none">
                {rows.map((row) => (
                  <Cell key={String(row[x])} fill={colorFor(String(row[x]))} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [currency(Number(v)), titleCase(String(name))]} {...TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <span className="text-xs text-slate-500">Total</span>
            <span className="text-xl font-semibold text-slate-50 tabular-nums">{currency(total)}</span>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm">
          {rows.map((row) => {
            const value = Number(row[key])
            return (
              <li key={String(row[x])} className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(String(row[x])) }} />
                <span className="flex-1 text-slate-300">{titleCase(String(row[x]))}</span>
                <span className="text-slate-500 tabular-nums">{Math.round((value / total) * 100)}%</span>
                <span className="w-20 text-right text-slate-200 tabular-nums">{currency(value)}</span>
              </li>
            )
          })}
        </ul>
      </div>
    </Card>
  )
}

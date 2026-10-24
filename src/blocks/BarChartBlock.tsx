import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { resolveSource } from '../data/resolve'
import type { BarBlock } from '../schema'
import { Card, Empty } from './Card'
import { compactCurrency, currency, titleCase } from './format'
import { AXIS, colorFor, GRID, TOOLTIP_STYLE } from './theme'

export function BarChartBlock({ block }: { block: BarBlock }) {
  const { rows, x, series } = resolveSource(block.source)
  const horizontal = block.orientation === 'horizontal'
  // A single series over categories reads better with each bar in its category's color.
  const colorByRow = series.length === 1 && x === 'category'

  if (!rows.length) {
    return (
      <Card title={block.title} span={block.span}>
        <Empty />
      </Card>
    )
  }

  return (
    <Card title={block.title} span={block.span}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: 8, right: 8 }}>
          <CartesianGrid stroke={GRID} vertical={horizontal} horizontal={!horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tickFormatter={compactCurrency} {...AXIS} />
              <YAxis type="category" dataKey={x} width={120} tickFormatter={titleCase} {...AXIS} />
            </>
          ) : (
            <>
              <XAxis dataKey={x} tickFormatter={titleCase} {...AXIS} />
              <YAxis tickFormatter={compactCurrency} width={56} {...AXIS} />
            </>
          )}
          <Tooltip formatter={(v) => currency(Number(v))} {...TOOLTIP_STYLE} />
          {series.length > 1 && <Legend formatter={titleCase} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((key) => (
            <Bar key={key} dataKey={key} name={key} fill={colorFor(key)} radius={4} maxBarSize={48}>
              {colorByRow && rows.map((row) => <Cell key={String(row[x])} fill={colorFor(String(row[x]))} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { resolveSource } from '../data/resolve'
import type { BarBlock } from '../schema'
import { Card, Empty } from './Card'
import { useChartAnimation } from './motion'
import { compactCurrency, currency, titleCase } from './format'
import { legendLabel } from './Legend'
import { AXIS, colorFor, GRID, LEGEND_PROPS, TOOLTIP_STYLE } from './theme'

export function BarChartBlock({ block }: { block: BarBlock }) {
  const { rows, x, series } = resolveSource(block.source)
  const animation = useChartAnimation()
  const horizontal = block.orientation === 'horizontal'
  // rounded data end, square end on the baseline
  const radius: [number, number, number, number] = horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
  // A single series over categories reads better with each bar in its category's color.
  const colorByRow = series.length === 1 && x === 'category'

  if (!rows.length) {
    return (
      <Card title={block.title}>
        <Empty />
      </Card>
    )
  }

  return (
    <Card title={block.title}>
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
          {series.length > 1 && <Legend formatter={legendLabel} {...LEGEND_PROPS} />}
          {series.map((key) => (
            <Bar key={key} dataKey={key} name={key} fill={colorFor(key)} radius={radius} maxBarSize={48} {...animation}>
              {colorByRow && rows.map((row) => <Cell key={String(row[x])} fill={colorFor(String(row[x]))} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

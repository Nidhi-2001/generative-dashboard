import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { resolveSource } from '../data/resolve'
import type { LineBlock } from '../schema'
import { Card } from './Card'
import { useChartAnimation } from './motion'
import { compactCurrency, currency } from './format'
import { legendLabel } from './Legend'
import { AXIS, colorFor, GRID, LEGEND_PROPS, TOOLTIP_STYLE } from './theme'

export function LineChartBlock({ block }: { block: LineBlock }) {
  const { rows, x, series } = resolveSource(block.source)
  const animation = useChartAnimation()

  return (
    <Card title={block.title}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ left: 8, right: 8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={x} {...AXIS} />
          <YAxis tickFormatter={compactCurrency} width={56} {...AXIS} />
          <Tooltip formatter={(v) => currency(Number(v))} {...TOOLTIP_STYLE} />
          {series.length > 1 && <Legend formatter={legendLabel} {...LEGEND_PROPS} />}
          {series.map((key) => (
            <Line
              key={key}
              dataKey={key}
              name={key}
              stroke={colorFor(key)}
              strokeWidth={2}
              dot={false}
              type="monotone"
              {...animation}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

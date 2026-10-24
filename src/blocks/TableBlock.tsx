import { resolveSource } from '../data/resolve'
import type { TableBlock as TableBlockType } from '../schema'
import { Card, Empty } from './Card'
import { currency, shortDate, titleCase } from './format'
import { colorFor } from './theme'

export function TableBlock({ block }: { block: TableBlockType }) {
  const { rows, series } = resolveSource(block.source)
  const ranked = block.source.kind === 'topExpenses'
  const columns = rows.length ? Object.keys(rows[0]) : []
  const isNumeric = (col: string) => series.includes(col)

  const cell = (col: string, value: string | number) => {
    if (isNumeric(col)) return currency(Number(value))
    if (col === 'date') return shortDate(String(value))
    if (col === 'category')
      return (
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: colorFor(String(value)) }} />
          {titleCase(String(value))}
        </span>
      )
    return value
  }

  return (
    <Card title={block.title} span={block.span}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                {ranked && <th className="w-8 pb-2 font-medium">#</th>}
                {columns.map((col) => (
                  <th key={col} className={`pb-2 font-medium ${isNumeric(col) ? 'text-right' : ''}`}>
                    {titleCase(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-800/60 last:border-0">
                  {ranked && <td className="py-2.5 text-slate-500 tabular-nums">{i + 1}</td>}
                  {columns.map((col) => (
                    <td
                      key={col}
                      className={`py-2.5 ${isNumeric(col) ? 'text-right text-slate-100 tabular-nums' : 'text-slate-300'}`}
                    >
                      {cell(col, row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

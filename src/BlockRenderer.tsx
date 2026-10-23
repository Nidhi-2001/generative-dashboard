// Maps an Answer's block array to components. Adding a block type = add it to
// schema.ts, then add one case here; the `never` check fails the build until you do.
import { BarChartBlock } from './blocks/BarChartBlock'
import { LineChartBlock } from './blocks/LineChartBlock'
import { PendingBlock } from './blocks/PendingBlock'
import { StatCard } from './blocks/StatCard'
import type { Block } from './schema'

function renderBlock(block: Block) {
  switch (block.type) {
    case 'stat':
      return <StatCard block={block} />
    case 'bar':
      return <BarChartBlock block={block} />
    case 'line':
      return <LineChartBlock block={block} />
    case 'donut': // TODO Sat 15:00
    case 'table': // TODO Sat 15:00
    case 'insight': // TODO Sat 15:00
      return <PendingBlock block={block} />
    default: {
      const unhandled: never = block
      return unhandled
    }
  }
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {blocks.map((block, i) => (
        <div key={`${block.type}-${i}`} className="contents">
          {renderBlock(block)}
        </div>
      ))}
    </div>
  )
}

// Maps an Answer's block array to components. Adding a block type = add it to
// schema.ts, then add one case here; the `never` check fails the build until you do.
import { motion } from 'framer-motion'
import { BarChartBlock } from './blocks/BarChartBlock'
import { DonutBlock } from './blocks/DonutBlock'
import { InsightBlock } from './blocks/InsightBlock'
import { LineChartBlock } from './blocks/LineChartBlock'
import { BlockDelay, blockDelay, EASE_OUT } from './blocks/motion'
import { StatCard } from './blocks/StatCard'
import { TableBlock } from './blocks/TableBlock'
import type { Block } from './schema'

const SPAN = { 1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3' } as const

function renderBlock(block: Block) {
  switch (block.type) {
    case 'stat':
      return <StatCard block={block} />
    case 'bar':
      return <BarChartBlock block={block} />
    case 'line':
      return <LineChartBlock block={block} />
    case 'donut':
      return <DonutBlock block={block} />
    case 'table':
      return <TableBlock block={block} />
    case 'insight':
      return <InsightBlock block={block} />
    default: {
      const unhandled: never = block
      return unhandled
    }
  }
}

/** Row index of each block on the 3-column grid, which places blocks in order and wraps when a row is full. */
function gridRows(blocks: Block[]) {
  let row = 0
  let used = 0
  return blocks.map((b) => {
    if (used + b.span > 3) {
      row++
      used = 0
    }
    used += b.span
    return row
  })
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  const rows = gridRows(blocks)
  // A stat sharing a row with a taller chart keeps its own height instead of
  // stretching into an empty box; a row of stats stays evenly sized.
  const mixedRows = new Set(rows.filter((_, i) => blocks[i].type !== 'stat'))
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {blocks.map((block, i) => (
        <motion.div
          key={`${block.type}-${i}`}
          className={`${SPAN[block.span]} ${block.type === 'stat' && mixedRows.has(rows[i]) ? 'md:self-start' : ''}`}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: blockDelay(i), ease: EASE_OUT }}
        >
          <BlockDelay.Provider value={blockDelay(i)}>{renderBlock(block)}</BlockDelay.Provider>
        </motion.div>
      ))}
    </div>
  )
}

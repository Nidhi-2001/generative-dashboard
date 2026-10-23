import type { Block } from '../schema'
import { Card } from './Card'

/** Stand-in for block types that validate but don't have a component yet. */
export function PendingBlock({ block }: { block: Block }) {
  return (
    <Card title={block.title} span={block.span}>
      <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">
        <code>{block.type}</code> block — not built yet
      </div>
    </Card>
  )
}

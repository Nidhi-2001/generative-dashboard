import { titleCase } from './format'

/** Legend formatter: series name in muted text, never in the series color. */
export const legendLabel = (value: string) => <span className="text-slate-300">{titleCase(value)}</span>

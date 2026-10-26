// Renders a JSON Schema as compact TypeScript-like notation for the prompt.
// zod's JSON Schema output is precise but verbose (~2.8k tokens for Answer);
// this carries the same constraints in about a quarter of that, which matters
// under Groq's tokens-per-minute limits. It's generated from the schema, so it
// can't drift from what Answer.safeParse accepts.
type Json = { [k: string]: unknown }

const lit = (v: unknown) => JSON.stringify(v)

export function compactSchema(schema: Json): string {
  const render = compactSchema
  if ('const' in schema) return lit(schema.const)
  if (Array.isArray(schema.enum)) return schema.enum.map(lit).join('|')
  const union = (schema.oneOf ?? schema.anyOf) as Json[] | undefined
  if (union) return union.map(render).join(' | ')

  switch (schema.type) {
    case 'string':
      return schema.maxLength ? `string(≤${schema.maxLength})` : 'string'
    case 'number':
    case 'integer': {
      const range = schema.minimum !== undefined || schema.maximum !== undefined
      const base = schema.type === 'integer' ? 'int' : 'number'
      const exMin = schema.exclusiveMinimum !== undefined ? `>${schema.exclusiveMinimum}` : ''
      return range ? `${base}(${schema.minimum ?? ''}..${schema.maximum ?? ''})` : exMin ? `${base}(${exMin})` : base
    }
    case 'boolean':
      return 'boolean'
    case 'array': {
      const items = render(schema.items as Json)
      const bounds = schema.minItems !== undefined || schema.maxItems !== undefined
      return `(${items})[]${bounds ? `(${schema.minItems ?? 0}..${schema.maxItems ?? ''} items)` : ''}`
    }
    case 'object': {
      const props = (schema.properties ?? {}) as Record<string, Json>
      const required = new Set((schema.required ?? []) as string[])
      const fields = Object.entries(props).map(([key, sub]) => {
        const note = typeof sub.description === 'string' ? ` /* ${sub.description} */` : ''
        return `${key}${required.has(key) ? '' : '?'}: ${render(sub)}${note}`
      })
      return `{ ${fields.join('; ')} }`
    }
    default:
      return 'unknown'
  }
}

/**
 * The whole schema as a few named type definitions: each alias is defined once
 * and every inline occurrence of it is replaced by its name.
 */
export function compactSchemaWithAliases(root: Json, aliases: [name: string, schema: Json][]) {
  // longest first, so an alias that contains another is replaced before its parts
  const rendered = aliases
    .map(([name, schema]) => [name, compactSchema(schema)] as const)
    .sort((a, b) => b[1].length - a[1].length)
  const shorten = (text: string, skip?: string) =>
    rendered.reduce((t, [name, r]) => (name === skip ? t : t.split(r).join(name)), text)
  const defs = rendered.map(([name, r]) => `${name} = ${shorten(r, name)}`).reverse()
  const text = [...defs, `Answer = ${shorten(compactSchema(root))}`].join('\n')
  // each description once: the first occurrence explains the rest
  const seen = new Set<string>()
  return text.replace(/ \/\* (.*?) \*\//g, (note, d: string) => (seen.has(d) ? '' : (seen.add(d), note)))
}

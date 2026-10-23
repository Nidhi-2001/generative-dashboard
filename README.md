# Ask Your Data

A generative dashboard: you type a question about your money and the app builds a different dashboard for it at runtime, from a typed JSON schema.

> **Status:** scaffold. The schema, seeded data, resolver, and `stat` / `bar` / `line` blocks work from a hard-coded answer. The question router, the `donut` / `table` / `insight` blocks, the shader header and the Groq stretch are still to do.

## Run

```sh
npm install
npm run dev
```

## How it works

```
question ─▶ answerEngine ─▶ Answer (JSON) ─▶ Answer.parse ─▶ BlockRenderer ─▶ blocks
                                                                 │
                                                  resolveSource / resolveMetric ◀── seeded dataset
```

| File | Role |
| --- | --- |
| `src/schema.ts` | **The product.** Zod schemas for `Answer` and the six block types. The TS types, runtime validation and LLM JSON Schema (`answerJsonSchema()`) all come from here. |
| `src/BlockRenderer.tsx` | Turns blocks into components. To add a block type, add one case here; the `never` check fails the build until you do. |
| `src/answerEngine.ts` | Takes a question and returns an `Answer`. For now every question gets the same hard-coded overview. |
| `src/data/generate.ts` | Six months of seeded synthetic transactions (Apr–Sep 2026), the same on every run. |
| `src/data/aggregates.ts` | Derived views: category totals, monthly trend, savings rate, top expenses, subscriptions. |
| `src/data/resolve.ts` | Turns a block's `source` / `metric` reference into real numbers. |

**Blocks reference data; they don't contain it.** A bar block says `source: { kind: "monthlyByCategory", categories: ["dining", "groceries"] }`, and the resolver fills in the numbers. Whoever writes the JSON (the rule-based router or an LLM) chooses the layout but can't invent a figure. The one exception is the prose in `insight` blocks, and that should always be written from values that were already computed.

## Example answer

```json
{
  "question": "Compare dining vs groceries",
  "summary": "Dining overtook groceries in September.",
  "blocks": [
    { "type": "bar", "title": "Dining vs groceries", "span": 3,
      "source": { "kind": "monthlyByCategory", "categories": ["dining", "groceries"] } }
  ]
}
```

## Deploy

`netlify.toml` builds `dist/`. For the Groq stretch, put the API call in `netlify/functions/` so the key never ships to the browser.

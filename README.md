# Ask Your Data

A generative dashboard: you type a question about your money and the app builds a different dashboard for it at runtime, from a typed JSON schema.

> **Status:** complete. Groq designs a layout for each question, with the rule-based router as the fallback. Dashboards are built from six block types (`stat`, `bar`, `line`, `donut`, `table`, `insight`), the header has an animated WebGL shader, and dashboards animate in as they're built.

## Run

```sh
npm install
npm run dev          # router only: /api/answer doesn't exist under Vite, so the app falls back
npx netlify dev      # with the AI path: put GROQ_API_KEY=... in .env first
npm test             # router, grounding, validation, the Groq call (mocked) and the endpoint
```

To enable AI layouts on Netlify, set `GROQ_API_KEY` under **Project configuration → Environment variables**. The default model is `openai/gpt-oss-120b`; set `GROQ_MODEL` to use a different one.

## How it works

```
question ─▶ answerEngine ─▶ Answer (JSON) ─▶ Answer.parse ─▶ BlockRenderer ─▶ blocks
                                                                 │
                                                  resolveSource / resolveMetric ◀── seeded dataset
```

| File | Role |
| --- | --- |
| `src/schema.ts` | **The product.** Zod schemas for `Answer` and the six block types. The TS types, runtime validation and LLM JSON Schema (`answerJsonSchema()`) all come from here. |
| `src/BlockRenderer.tsx` | Turns blocks into components and places them on the grid. To add a block type, add one case here; the `never` check fails the build until you do. |
| `src/blocks/motion.ts` | The assembly timing. Blocks arrive in reading order, each chart starts drawing as its card lands, and stat numbers count up (`CountUp.tsx`). The motion shows that the dashboard was built for your question rather than fetched. |
| `src/answerEngine.ts` | Takes a question and returns an `Answer`. It tries the AI path first and falls back to the router on any failure. Either way the result is validated before it renders. |
| `src/llm/` | The AI path: facts digest, generated prompt, grounding check, Groq call (`server.ts`) and request handler (`endpoint.ts`, served by `netlify/functions/answer.ts`). |
| `src/router.ts` | The rule-based router. It parses the categories, month and dollar amount a question mentions, then the first matching intent builds the layout. Summaries and insight text are computed from the data. Anything it doesn't recognize gets the overview, not an error. |
| `src/data/generate.ts` | Six months of seeded synthetic transactions (Apr–Sep 2026), the same on every run. |
| `src/data/aggregates.ts` | Derived views: category totals, monthly trend, savings rate, top expenses, subscriptions. |
| `src/data/resolve.ts` | Turns a block's `source` / `metric` reference into real numbers. |
| `src/ShaderBackground.tsx` | The animated header gradient: one GLSL fragment shader (domain-warped fbm noise) on a raw WebGL canvas. It speeds up briefly when a new dashboard is built. It also shows a still frame when the user prefers reduced motion, pauses when off screen or in a background tab, and falls back to a CSS gradient without WebGL. |

**Chart colors** follow the entity, never its rank: each category keeps one color on every dashboard. The palette was checked with a colorblind-safety validator against the card background (worst adjacent pair ΔE 8.4 for color-blind viewers, 19.3 for normal vision). Legend text stays neutral, so color is never the only way to tell series apart.

**Blocks reference data; they don't contain it.** A bar block says `source: { kind: "monthlyByCategory", categories: ["dining", "groceries"] }`, and the resolver fills in the numbers. Whoever writes the JSON (the rule-based router or an LLM) chooses the layout but can't invent a figure. The one exception is the prose in `insight` blocks, and that should always be written from values that were already computed.

## AI layouts, and why they can't make things up

```
question ─▶ /api/answer (Netlify function) ─▶ Groq (JSON mode) ─▶ JSON.parse ─▶ Answer.safeParse ─▶ grounding check ─▶ dashboard
                        │                                                                                  │
                        └──────────── any failure: no key, timeout, bad JSON, schema error, ungrounded number ─▶ rule-based router
```

- **The prompt is generated, not hand-written.** It's built from `answerJsonSchema()`, a digest of facts computed from the data (`src/llm/facts.ts`), and two example answers from the router. All three come from code, so the prompt can't drift out of sync with what the app accepts.
- **Blocks can't carry numbers**, so the model chooses the layout and the app fills in the figures.
- **Prose is checked against the facts.** Any dollar amount, percentage or large number in the summary, a title or an insight must match a value in the facts digest, or in per-question facts such as the math for "can I afford $X". One unmatched figure rejects the whole answer (`src/llm/grounding.ts`). As a test, every router answer must pass the same check, because those answers are also the prompt's examples.
- **It fails safe.** Every failure ends with the router answering, and the page labels which path built each dashboard and why it fell back. The API key stays on the server and the first page load makes no AI call.
- **It fits a free-tier token budget.** The prompt carries the schema as compact, generated TypeScript-like types instead of raw JSON Schema, which halved the prompt to about 2,400 tokens. Good answers are cached in Netlify Blobs, keyed by a hash of the prompt and model, so repeat questions cost nothing and a prompt change invalidates old answers. A brief Groq rate limit gets one short retry; a longer one falls back with the wait time shown.

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

`netlify.toml` builds `dist/` and deploys `netlify/functions/`. The Groq call runs in that function, so the key never reaches the browser.

## What I'd do next

With real data, the first change is moving the data layer to the server. Sources and metrics would become typed queries against a real transaction store (Pocket's Supabase tables are the obvious first one), and the facts digest would be computed per user. The model would still see only aggregates, never raw transactions, which keeps both privacy and the grounding check intact. Real data also brings problems a seeded dataset hides: inconsistent merchant names, miscategorized charges, partial months, multiple currencies. Each of those needs handling before the numbers are worth trusting. On the LLM side, I'd replace the fixed list of sources with a small query language the model can compose (filter, group by, time range), so it can answer questions I didn't anticipate while still never writing a number into the layout. I'd also have insights cite facts by reference instead of as free text, which makes grounding a structural guarantee rather than a regex check. Then I'd build an eval set of a few hundred real questions, tracking how often answers pass validation, how often grounding rejects them, how long they take, and whether the layout fits the question. Those numbers, not demo impressions, would decide when to switch to schema-constrained decoding, stream blocks in as they arrive, or let follow-up questions edit the current dashboard instead of rebuilding it.

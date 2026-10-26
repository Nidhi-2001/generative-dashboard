// The system prompt is generated, not hand-written: the schema comes from
// answerJsonSchema(), the facts from the dataset, and the examples from the
// rule-based router, so none of them can drift from what the app accepts.
import { route } from '../router'
import { z } from 'zod'
import { answerJsonSchema, Metric, Month, Source, SpendCategory } from '../schema'
import { compactSchemaWithAliases } from './compactSchema'
import type { Facts } from './facts'

// Deliberately different shapes (stats + chart, table + bar, stats + line), so the
// model learns the range of layouts rather than one template to copy.
const EXAMPLE_QUESTIONS = ['Compare dining vs groceries', 'What are my biggest expenses?', "What's my savings rate?"]

const toJson = (s: z.ZodType) => z.toJSONSchema(s, { io: 'input' }) as Record<string, unknown>

function schemaText() {
  return compactSchemaWithAliases(answerJsonSchema() as Record<string, unknown>, [
    ['Month', toJson(Month)],
    ['Category', toJson(SpendCategory)],
    ['Source', toJson(Source)],
    ['Metric', toJson(Metric)],
  ])
}

export function buildSystemPrompt(facts: Facts) {
  const examples = EXAMPLE_QUESTIONS.map((q) => {
    const { question, ...answer } = route(q).answer
    return `Question: ${question}\nAnswer: ${JSON.stringify(answer)}`
  }).join('\n\n')
  return `You design dashboards. Given a question about the user's personal finances, reply with ONE JSON object: an Answer that lays out the dashboard which best answers it.

Rules:
- Output only the JSON object, matching this schema exactly (TypeScript-like; "?" marks optional fields):
${schemaText()}
- Blocks never contain data. Charts, tables and stats name a "source" or "metric" and the app fills in the numbers.
- Answer THIS question. The summary must respond to what was asked; never reuse an example's summary or layout for a different question.
- Lay blocks out on a 3-column grid with "span" (1–3). Each row's spans add up to exactly 3. Use 3–6 blocks, and include at least one chart or table, not only stats.
- Pick forms by the data's job: stat for a headline number (add "compare": "previousMonth" for month-scoped metrics), donut for parts of a whole, line for change over time, bar for comparing categories or ranking, table for lists the user will scan (expenses, subscriptions), insight for one sentence of interpretation.
- "summary" is a one-sentence answer to the question.
- Any number you write in "summary", a "title" or an insight's "text" MUST be copied from FACTS below, or from QUESTION FACTS when the user message includes them (rounding to whole dollars or whole percents is fine). Never calculate new figures. If a number you want isn't in FACTS, say it without the number.
- Months are "YYYY-MM" and must be within the data window. Omit "month" to mean the latest month.
- Questions about a merchant (Uber, Netflix, Trader Joe's…) map to its category; FACTS.merchantTotalsSixMonths lists every merchant under its category, with its total.
- If the question isn't about this data, return an overview dashboard and say so in the summary.

FACTS:
${JSON.stringify(facts)}

Examples of good answers:
${examples}`
}

// Grounding check for model-written prose. Blocks can't carry numbers (they
// reference data), but summaries and insights are free text, so every money
// amount, percentage or large number in them must match a value in the facts
// digest or the question. One unmatched figure rejects the whole answer.
import type { AnswerInput } from '../schema'

/** Every number that appears anywhere in a JSON-like value. */
function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value)
  else if (typeof value === 'string') out.push(...numbersIn(value).map((t) => t.value))
  else if (Array.isArray(value)) value.forEach((v) => collectNumbers(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectNumbers(v, out))
  return out
}

interface NumberToken {
  raw: string
  value: number
  money: boolean
  percent: boolean
}

function numbersIn(text: string): NumberToken[] {
  const tokens: NumberToken[] = []
  for (const m of text.matchAll(/(\$)?\s?(\d[\d,]*(?:\.\d+)?)\s?([kK]\b)?\s?(%| ?pts?\b| ?percent\b)?/g)) {
    const value = Number(m[2].replace(/,/g, '')) * (m[3] ? 1000 : 1)
    if (Number.isFinite(value)) tokens.push({ raw: m[0].trim(), value, money: !!m[1], percent: !!m[4] })
  }
  return tokens
}

/** Small counts ("6 months", "3 subscriptions", "Sep 30") and the year need no source. */
const needsSource = (t: NumberToken) => t.money || t.percent || (t.value > 31 && t.value !== 2026)

function matches(t: NumberToken, allowed: number[]) {
  // money: allow whole-dollar rounding and "$3.2K"-style abbreviation
  // percent: allow rounding to a whole number
  const tolerance = (a: number) =>
    t.percent ? 0.51 : t.raw.match(/[kK]/) ? Math.max(50, a * 0.05) : Math.max(0.51, a * 0.005)
  return allowed.some((a) => Math.abs(Math.abs(a) - t.value) <= tolerance(Math.abs(a)))
}

export function findUngroundedNumber(answer: AnswerInput, facts: unknown, question: string): string | undefined {
  const allowed = [...collectNumbers(facts), ...collectNumbers(question)]
  const texts = [answer.summary, ...answer.blocks.flatMap((b) => [b.title, b.type === 'insight' ? b.text : ''])]
  for (const text of texts) {
    const bad = numbersIn(text).find((t) => needsSource(t) && !matches(t, allowed))
    if (bad) return bad.raw
  }
  // block parameters that carry a number (the afford amount) must come from the question
  for (const b of answer.blocks) {
    if (b.type !== 'stat' || b.metric.kind !== 'balanceAfterPurchase') continue
    const { amount } = b.metric
    if (!collectNumbers(question).some((n) => Math.abs(n - amount) < 0.01)) return `amount ${amount}`
  }
  return undefined
}

// Server side of the AI path: question → Groq → validated Answer, or a reason
// why not. Runs inside the Netlify function so the API key never reaches the
// browser. Every failure mode returns { ok: false } and the client falls back
// to the rule-based router: an AI that emits a bad layout degrades, never errors.
import { parse } from '../router'
import { Answer } from '../schema'
import { buildFacts, buildQuestionFacts } from './facts'
import { findUngroundedNumber } from './grounding'
import { buildSystemPrompt } from './prompt'

export const DEFAULT_MODEL = 'openai/gpt-oss-120b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export type Generated = { ok: true; answer: Answer; model: string } | { ok: false; reason: string }

interface Options {
  apiKey: string
  model?: string
  timeoutMs?: number
  fetch?: typeof fetch
}

const facts = buildFacts()
const systemPrompt = buildSystemPrompt(facts)

/** Parse, schema-check and grounding-check raw model output. */
export function validateModelOutput(content: string, question: string, model: string): Generated {
  let json: unknown
  try {
    json = JSON.parse(content)
  } catch {
    return { ok: false, reason: 'model returned invalid JSON' }
  }
  const parsed = Answer.safeParse({ ...(json as object), question })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, reason: `schema: ${issue.path.join('.') || 'answer'}: ${issue.message}` }
  }
  const ungrounded = findUngroundedNumber(parsed.data, [facts, buildQuestionFacts(parse(question).amount)], question)
  if (ungrounded) return { ok: false, reason: `ungrounded number “${ungrounded}”` }
  return { ok: true, answer: parsed.data, model }
}

export async function generateAnswer(question: string, opts: Options): Promise<Generated> {
  const model = opts.model || DEFAULT_MODEL
  const questionFacts = buildQuestionFacts(parse(question).amount)
  const doFetch = opts.fetch ?? fetch
  try {
    const res = await doFetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        // gpt-oss models reason before answering; low effort keeps latency demo-friendly
        ...(model.startsWith('openai/gpt-oss') && { reasoning_effort: 'low' }),
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: questionFacts ? `${question}\n\nQUESTION FACTS:\n${JSON.stringify(questionFacts)}` : question,
          },
        ],
      }),
    })
    if (!res.ok) return { ok: false, reason: `Groq returned HTTP ${res.status}` }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) return { ok: false, reason: 'Groq returned no content' }
    return validateModelOutput(content, question, model)
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError'
    return { ok: false, reason: timedOut ? 'Groq timed out' : 'could not reach Groq' }
  }
}

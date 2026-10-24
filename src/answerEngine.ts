// Question in → Answer out.
//
// Two paths, one contract. The AI path asks /api/answer (a Netlify function that
// calls Groq and validates the result); the rule-based router in router.ts is the
// fallback for every failure: no endpoint, timeout, invalid JSON, schema errors,
// or a number in the prose that isn't in the data. Either way the result goes
// through Answer.parse before it renders.
import { route } from './router'
import { Answer } from './schema'

export interface Built {
  answer: Answer
  source: 'ai' | 'router'
  model?: string
  /** Why the AI path wasn't used, when it was tried. */
  fallbackReason?: string
}

export function answer(question: string): Answer {
  return Answer.parse(route(question).answer)
}

export const routerAnswer = (question: string): Built => ({ answer: answer(question), source: 'router' })

export async function aiAnswer(question: string, signal?: AbortSignal): Promise<Built> {
  const fallback = (fallbackReason: string): Built => ({ ...routerAnswer(question), fallbackReason })
  try {
    const res = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
    })
    if (res.status === 404) return fallback('AI endpoint not available here')
    const body = (await res.json()) as { ok: boolean; answer?: unknown; model?: string; reason?: string }
    if (!body.ok) return fallback(body.reason ?? `HTTP ${res.status}`)
    // Don't trust the wire: validate again before rendering.
    const parsed = Answer.safeParse(body.answer)
    if (!parsed.success) return fallback('AI answer failed validation')
    return { answer: parsed.data, source: 'ai', model: body.model }
  } catch (err) {
    if (signal?.aborted) throw err
    return fallback(err instanceof DOMException && err.name === 'TimeoutError' ? 'AI timed out' : 'AI unavailable')
  }
}

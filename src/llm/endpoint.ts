// POST /api/answer { question } → { ok: true, answer, model } | { ok: false, reason }
// The Netlify function (netlify/functions/answer.ts) passes in process.env.
import { generateAnswer, type Generated } from './server'

export interface Env {
  GROQ_API_KEY?: string
  GROQ_MODEL?: string
}

// Warm instances reuse answers, so repeated demo questions don't spend tokens.
const cache = new Map<string, Generated>()
const CACHE_LIMIT = 100

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export async function handleAnswerRequest(req: Request, env: Env) {
  if (req.method !== 'POST') return json({ ok: false, reason: 'POST only' }, 405)

  const apiKey = env.GROQ_API_KEY
  if (!apiKey) return json({ ok: false, reason: 'AI is not configured on this deploy' })

  let question: unknown
  try {
    ;({ question } = (await req.json()) as { question?: unknown })
  } catch {
    return json({ ok: false, reason: 'bad request' }, 400)
  }
  if (typeof question !== 'string' || !question.trim() || question.length > 200) {
    return json({ ok: false, reason: 'question must be 1–200 characters' }, 400)
  }

  const key = question.trim().toLowerCase()
  const hit = cache.get(key)
  if (hit?.ok) return json({ ...hit, answer: { ...hit.answer, question } })

  const result = await generateAnswer(question.trim(), { apiKey, model: env.GROQ_MODEL })
  if (result.ok) {
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
    cache.set(key, result)
  } else {
    console.warn('AI answer rejected:', question, '→', result.reason)
  }
  return json(result)
}

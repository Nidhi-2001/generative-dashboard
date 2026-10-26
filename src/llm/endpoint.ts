// POST /api/answer { question } → { ok: true, answer, model } | { ok: false, reason }
// The Netlify function (netlify/functions/answer.ts) passes in process.env and a
// persistent cache.
import { cacheVersion, DEFAULT_MODEL, generateAnswer, shortHash, type Generated } from './server'

export interface Env {
  GROQ_API_KEY?: string
  GROQ_MODEL?: string
}

/** Where good answers are kept. The data never changes, so an answer stays valid until the prompt or model does. */
export interface AnswerCache {
  get(key: string): Promise<Generated | null | undefined>
  set(key: string, value: Generated): Promise<unknown>
}

// Warm instances answer from memory; the persistent cache covers cold starts and other instances.
const memory = new Map<string, Generated>()
const MEMORY_LIMIT = 100

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export async function handleAnswerRequest(req: Request, env: Env, cache?: AnswerCache) {
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

  const model = env.GROQ_MODEL || DEFAULT_MODEL
  const key = `${await cacheVersion(model)}/${await shortHash(question.trim().toLowerCase())}`
  const reply = (hit: Generated & { ok: true }) => json({ ...hit, answer: { ...hit.answer, question } })

  const fromMemory = memory.get(key)
  if (fromMemory?.ok) return reply(fromMemory)
  const stored = await cache?.get(key).catch(() => undefined) // a cache outage must not break answering
  if (stored?.ok) {
    memory.set(key, stored)
    return reply(stored)
  }

  const result = await generateAnswer(question.trim(), { apiKey, model })
  if (result.ok) {
    if (memory.size >= MEMORY_LIMIT) memory.delete(memory.keys().next().value!)
    memory.set(key, result)
    await cache?.set(key, result).catch(() => undefined)
  } else {
    console.warn('AI answer rejected:', question, '→', result.reason)
  }
  return json(result)
}

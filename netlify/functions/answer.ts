// POST /api/answer — the logic lives in src/llm/endpoint.ts, where it's typechecked
// and tested. Env: GROQ_API_KEY (required), GROQ_MODEL (optional override).
import { getStore } from '@netlify/blobs'
import type { Generated } from '../../src/llm/server'
import { handleAnswerRequest } from '../../src/llm/endpoint'

export default (req: Request) => {
  const store = getStore('ai-answers')
  return handleAnswerRequest(req, process.env, {
    get: (key) => store.get(key, { type: 'json' }) as Promise<Generated | null>,
    set: (key, value) => store.setJSON(key, value),
  })
}

export const config = { path: '/api/answer' }

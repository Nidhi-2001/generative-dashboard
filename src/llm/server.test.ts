import { describe, expect, it, vi } from 'vitest'
import { parse, route } from '../router'
import { Answer, type AnswerInput } from '../schema'
import { buildFacts, buildQuestionFacts } from './facts'
import { handleAnswerRequest } from './endpoint'
import { findUngroundedNumber } from './grounding'
import { generateAnswer, validateModelOutput } from './server'

const DEMO = [
  'Where did my money go this month?',
  'How has my spending changed over 6 months?',
  'What are my biggest expenses?',
  'How much do I spend on subscriptions?',
  "What's my savings rate?",
  'Can I afford a $400 purchase?',
  'Compare dining vs groceries',
]

const facts = buildFacts()
const withSummary = (summary: string): AnswerInput => ({
  ...route('Where did my money go this month?').answer,
  summary,
})
const groqReply = (content: unknown, status = 200) =>
  vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status }),
    )

describe('grounding', () => {
  // The router's answers are the prompt's examples, so they must pass the check themselves.
  it.each(DEMO)('router answer is grounded: %s', (q) => {
    expect(findUngroundedNumber(route(q).answer, [facts, buildQuestionFacts(parse(q).amount)], q)).toBeUndefined()
  })

  it('accepts figures from the facts, rounded or abbreviated', () => {
    expect(
      findUngroundedNumber(withSummary('You spent $3,171 in September, 57% on housing.'), facts, ''),
    ).toBeUndefined()
    expect(findUngroundedNumber(withSummary('Dining is up 40% since April.'), facts, '')).toBeUndefined()
    expect(findUngroundedNumber(withSummary('About $3.2K spent over 6 months of data.'), facts, '')).toBeUndefined()
  })

  it('rejects figures that are not in the data', () => {
    expect(findUngroundedNumber(withSummary('You spent $4,250 in September.'), facts, '')).toBe('$4,250')
    expect(findUngroundedNumber(withSummary('Dining is up 73%.'), facts, '')).toBe('73%')
  })

  it('rejects an afford amount that differs from the question', () => {
    const a = route('Can I afford a $400 purchase?').answer
    expect(findUngroundedNumber(a, [facts, buildQuestionFacts(400)], 'Can I afford $500?')).toMatch(/400/)
  })
})

describe('validateModelOutput', () => {
  const q = 'Compare dining vs groceries'

  it('accepts a valid, grounded answer and pins the question', () => {
    const result = validateModelOutput(JSON.stringify({ ...route(q).answer, question: 'something else' }), q, 'm')
    expect(result).toMatchObject({ ok: true, model: 'm', answer: { question: q } })
  })

  it('rejects invalid JSON', () => {
    expect(validateModelOutput('{"summary": ', q, 'm')).toEqual({ ok: false, reason: 'model returned invalid JSON' })
  })

  it('rejects schema violations with the failing path', () => {
    const bad = { summary: 'x', blocks: [{ type: 'sparkline', title: 'x' }] }
    const result = validateModelOutput(JSON.stringify(bad), q, 'm')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toMatch(/^schema: blocks\.0/)
  })

  it('rejects made-up numbers', () => {
    const result = validateModelOutput(JSON.stringify(withSummary('You spent $9,999.')), q, 'm')
    expect(result).toEqual({ ok: false, reason: 'ungrounded number “$9,999”' })
  })
})

describe('generateAnswer', () => {
  it('calls Groq in JSON mode with the facts, and returns the validated answer', async () => {
    const fetch = groqReply(route('Can I afford a $400 purchase?').answer)
    const result = await generateAnswer('Can I afford a $400 purchase?', { apiKey: 'k', model: 'test-model', fetch })
    expect(result).toMatchObject({ ok: true, model: 'test-model' })

    const [url, init] = fetch.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer k')
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.messages[0].content).toContain('FACTS:')
    expect(body.messages[1].content).toContain('QUESTION FACTS')
  })

  it('retries once after a short rate-limit wait, and explains a long one', async () => {
    const limited = (after: string) => new Response('{}', { status: 429, headers: { 'retry-after': after } })
    const ok = await groqReply(route('Compare dining vs groceries').answer)()
    const brief = vi.fn().mockResolvedValueOnce(limited('0.01')).mockResolvedValueOnce(ok)
    expect(await generateAnswer('Compare dining vs groceries', { apiKey: 'k', fetch: brief })).toMatchObject({
      ok: true,
    })
    expect(brief).toHaveBeenCalledTimes(2)

    const long = vi.fn().mockResolvedValue(limited('30'))
    expect(await generateAnswer('q', { apiKey: 'k', fetch: long })).toEqual({
      ok: false,
      reason: 'Groq rate limit reached, try again in 30s',
    })
    expect(long).toHaveBeenCalledTimes(1)
  })

  it('reports HTTP errors and network failures instead of throwing', async () => {
    expect(await generateAnswer('q', { apiKey: 'k', fetch: groqReply({}, 500) })).toEqual({
      ok: false,
      reason: 'Groq returned HTTP 500',
    })
    const down = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    expect(await generateAnswer('q', { apiKey: 'k', fetch: down })).toEqual({
      ok: false,
      reason: 'could not reach Groq',
    })
  })
})

describe('/api/answer', () => {
  const post = (body: unknown, env = { GROQ_API_KEY: 'k' }) =>
    handleAnswerRequest(new Request('http://x/api/answer', { method: 'POST', body: JSON.stringify(body) }), env)

  it('says so when the key is missing, so the client can fall back', async () => {
    const res = await post({ question: 'hi' }, { GROQ_API_KEY: '' })
    expect(await res.json()).toEqual({ ok: false, reason: 'AI is not configured on this deploy' })
  })

  it('serves cached answers without calling Groq', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const cached = { ok: true, model: 'm', answer: Answer.parse(route('Compare dining vs groceries').answer) }
    const cache = { get: vi.fn().mockResolvedValue(cached), set: vi.fn() }
    const res = await handleAnswerRequest(
      new Request('http://x/api/answer', {
        method: 'POST',
        body: JSON.stringify({ question: 'Dining VS groceries?' }),
      }),
      { GROQ_API_KEY: 'k' },
      cache,
    )
    expect(await res.json()).toMatchObject({ ok: true, answer: { question: 'Dining VS groceries?' } })
    expect(fetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('keeps answering when the cache is down, and stores the new answer', async () => {
    vi.stubGlobal('fetch', groqReply(route("What's my savings rate?").answer))
    const cache = { get: vi.fn().mockRejectedValue(new Error('blobs down')), set: vi.fn().mockResolvedValue(undefined) }
    const res = await handleAnswerRequest(
      new Request('http://x/api/answer', {
        method: 'POST',
        body: JSON.stringify({ question: "What's my savings rate?" }),
      }),
      { GROQ_API_KEY: 'k' },
      cache,
    )
    expect(await res.json()).toMatchObject({ ok: true })
    expect(cache.set).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('validates the request', async () => {
    expect((await post({ question: '' })).status).toBe(400)
    expect((await post({ question: 'x'.repeat(201) })).status).toBe(400)
    expect((await handleAnswerRequest(new Request('http://x/api/answer'), {})).status).toBe(405)
  })
})

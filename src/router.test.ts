import { describe, expect, it } from 'vitest'
import { answer } from './answerEngine'
import { parse, route } from './router'
import { Answer } from './schema'

const DEMO: [string, string][] = [
  ['Where did my money go this month?', 'breakdown'],
  ['How has my spending changed over 6 months?', 'trend'],
  ['What are my biggest expenses?', 'biggest'],
  ['How much do I spend on subscriptions?', 'subscriptions'],
  ["What's my savings rate?", 'savings'],
  ['Can I afford a $400 purchase?', 'afford'],
  ['Compare dining vs groceries', 'compare'],
]

const layout = (q: string) => answer(q).blocks.map((b) => `${b.type}:${b.span}`).join(',')

describe('router', () => {
  it.each(DEMO)('%s → %s', (q, intent) => {
    expect(route(q).intent).toBe(intent)
    expect(Answer.safeParse(route(q).answer).success).toBe(true)
  })

  it('gives every demo question a visibly different layout', () => {
    const layouts = DEMO.map(([q]) => layout(q))
    expect(new Set(layouts).size).toBe(DEMO.length)
  })

  it.each([
    ['What did I spend on rent in August?', 'category'],
    ['Show me a breakdown for July', 'breakdown'],
    ['how much on uber and lyft vs eating out', 'compare'],
    ['Is my dining going up?', 'category'],
    ['How has dining changed?', 'category'],
    ['Has my spending increased?', 'trend'],
    ['Could I afford 1,200 dollars for a new laptop?', 'afford'],
    ['top expenses in june', 'biggest'],
    ['what is the meaning of life', 'overview'],
    ['', 'overview'],
  ])('%s → %s', (q, intent) => {
    expect(route(q).intent).toBe(intent)
    expect(() => answer(q)).not.toThrow()
  })

  it('parses months, amounts and categories', () => {
    expect(parse('spending in August').month).toBe('2026-08')
    expect(parse('May I see my rent?').month).toBeUndefined()
    expect(parse('in December').month).toBeUndefined() // outside the dataset
    expect(parse('last month').month).toBe('2026-08')
    expect(parse('afford $1,250.50?').amount).toBe(1250.5)
    expect(parse('restaurants vs groceries').categories).toEqual(['dining', 'groceries'])
  })

  it('writes summaries from the data', () => {
    expect(answer('Can I afford a $400 purchase?').summary).toMatch(/\$400/)
    expect(answer('Can I afford $15,000?').summary).toMatch(/^Not right now\. \$15,000 is [\d.]+ months of savings\.$/)
    expect(answer('Compare dining vs groceries').blocks.at(-1)?.title).toBe('Dining vs groceries, by month')
  })
})

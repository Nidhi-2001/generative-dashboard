// Question in → Answer out.
//
// v1 (Sat 13:00): keyword/intent router over the demo question bank, overview as fallback.
// Stretch (Sun 11:00): Groq via a Netlify function, prompted with answerJsonSchema(),
// result checked with Answer.safeParse — any failure falls back to the router.
//
// For now every question gets the same hard-coded overview, so the renderer has
// something real to draw.
import { Answer, type AnswerInput } from './schema'

function overview(question: string): AnswerInput {
  return {
    question,
    summary: 'Here’s the big picture for September.',
    blocks: [
      { type: 'stat', title: 'Spent this month', metric: { kind: 'totalSpend' }, compare: 'previousMonth' },
      { type: 'stat', title: 'Savings rate', metric: { kind: 'savingsRate' }, compare: 'previousMonth' },
      { type: 'stat', title: 'Balance', metric: { kind: 'balance' } },
      { type: 'line', title: 'Income vs spending', span: 2, source: { kind: 'monthlyTotals' } },
      { type: 'bar', title: 'By category', orientation: 'horizontal', source: { kind: 'categoryTotals' } },
      { type: 'bar', title: 'Dining vs groceries', span: 3, source: { kind: 'monthlyByCategory', categories: ['dining', 'groceries'] } },
    ],
  }
}

export function answer(question: string): Answer {
  // Parsing even hand-written answers keeps the router honest and fills defaults.
  return Answer.parse(overview(question))
}

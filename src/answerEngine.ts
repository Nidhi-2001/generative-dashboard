// Question in → Answer out.
//
// v1: the rule-based router in router.ts.
// Stretch (Sun 11:00): Groq via a Netlify function, prompted with answerJsonSchema(),
// result checked with Answer.safeParse — any failure falls back to the router.
import { route } from './router'
import { Answer } from './schema'

export function answer(question: string): Answer {
  // Parsing even router-built answers keeps the router honest and fills defaults.
  return Answer.parse(route(question).answer)
}

// Asks a deployed /api/answer a fixed set of questions and reports, for each,
// whether Groq's answer was accepted, how long it took, and the layout it chose.
// Spaced out by default so the run stays under Groq's free-tier tokens/minute.
//
//   npm run eval:live -- https://your-site.netlify.app      (GAP=25000 ms between questions)
const base = process.argv[2] ?? 'https://generative-dashboard.netlify.app'
const gap = Number(process.env.GAP ?? 25_000)

const QUESTIONS = [
  // the demo chips
  'Where did my money go this month?',
  'How has my spending changed over 6 months?',
  'What are my biggest expenses?',
  'How much do I spend on subscriptions?',
  "What's my savings rate?",
  'Can I afford a $400 purchase?',
  'Compare dining vs groceries',
  // questions the router was never written for
  'Is dining getting out of hand?',
  'What happened in August?',
  'Should I cancel any subscriptions?',
  'Can I afford a $2,500 laptop?',
  'How much did I spend on uber and lyft?',
  'Am I on track to save $10,000 this year?',
  'what is the weather today',
  'Show me everything about housing',
]

let accepted = 0
for (const [i, question] of QUESTIONS.entries()) {
  if (i > 0) await new Promise((resolve) => setTimeout(resolve, gap))
  const started = Date.now()
  let result
  try {
    const res = await fetch(`${base}/api/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    result = await res.json()
  } catch (err) {
    result = { ok: false, reason: `request failed: ${err.message}` }
  }
  const ms = String(Date.now() - started).padStart(5)
  if (result.ok) {
    accepted++
    const layout = result.answer.blocks.map((b) => `${b.type}${b.span ?? 1}`).join(' ')
    console.log(`AI    ${ms}ms  ${question}\n      ${result.answer.summary}\n      ${layout}`)
  } else {
    console.log(`FALL  ${ms}ms  ${question}\n      ${result.reason}`)
  }
}
console.log(`\n${accepted}/${QUESTIONS.length} answered by Groq`)

import { useState } from 'react'
import { answer } from './answerEngine'
import { BlockRenderer } from './BlockRenderer'
import { ShaderBackground } from './ShaderBackground'

const DEMO_QUESTIONS = [
  'Where did my money go this month?',
  'How has my spending changed over 6 months?',
  'What are my biggest expenses?',
  'How much do I spend on subscriptions?',
  "What's my savings rate?",
  'Can I afford a $400 purchase?',
  'Compare dining vs groceries',
]

export default function App() {
  const [draft, setDraft] = useState('')
  const [current, setCurrent] = useState(() => answer(DEMO_QUESTIONS[0]))

  const ask = (question: string) => {
    if (!question.trim()) return
    setCurrent(answer(question.trim()))
    setDraft('')
  }

  return (
    <>
      <header className="relative isolate overflow-hidden">
        <ShaderBackground pulseKey={current} className="absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-50">Ask your data</h1>
          <p className="mt-2 text-slate-300">Ask a question about your money and get a dashboard built for it.</p>
          <form
            className="mt-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              ask(draft)
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask a question about your money…"
              className="min-w-0 flex-1 rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
            />
            <button className="rounded-xl bg-indigo-500 px-5 font-medium text-white hover:bg-indigo-400">Ask</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="rounded-full border border-slate-700/70 bg-slate-950/40 px-3 py-1 text-xs text-slate-300 backdrop-blur-sm hover:border-slate-500 hover:text-slate-100"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10">
        <p className="mb-1 text-sm text-slate-500">{current.question}</p>
        <h2 className="mb-6 text-xl font-medium text-slate-100">{current.summary}</h2>
        <BlockRenderer blocks={current.blocks} />

        <details className="mt-8 text-xs text-slate-500">
          <summary className="cursor-pointer select-none">View the JSON that built this dashboard</summary>
          <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
            {JSON.stringify(current, null, 2)}
          </pre>
        </details>
      </main>
    </>
  )
}

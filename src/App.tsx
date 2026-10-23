import { useState } from 'react'
import { answer } from './answerEngine'
import { BlockRenderer } from './BlockRenderer'

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
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Sat 17:00: the WebGL gradient goes behind this header */}
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Ask your data</h1>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            ask(draft)
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask a question about your money…"
            className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          />
          <button className="rounded-xl bg-indigo-500 px-5 font-medium text-white hover:bg-indigo-400">Ask</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400 hover:border-slate-600 hover:text-slate-200"
            >
              {q}
            </button>
          ))}
        </div>
      </header>

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
  )
}

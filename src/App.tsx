import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { useRef, useState } from 'react'
import { aiAnswer, routerAnswer, type Built } from './answerEngine'
import { BlockRenderer } from './BlockRenderer'
import { EASE_OUT } from './blocks/motion'
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
  // `id` re-keys the dashboard so asking the same question again rebuilds it too.
  // The first dashboard comes from the router, so loading the page costs no tokens.
  const [{ id, built }, setState] = useState(() => ({ id: 0, built: routerAnswer(DEMO_QUESTIONS[0]) }))
  const [aiEnabled, setAiEnabled] = useState(true)
  const [pending, setPending] = useState<string>()
  const inFlight = useRef<AbortController>(undefined)
  const current = built.answer

  const show = (next: Built) => setState((s) => ({ id: s.id + 1, built: next }))

  const ask = async (raw: string) => {
    const question = raw.trim()
    if (!question) return
    setDraft('')
    inFlight.current?.abort() // a newer question wins; a slow older reply must not overwrite it
    if (!aiEnabled) {
      setPending(undefined)
      return show(routerAnswer(question))
    }
    const controller = new AbortController()
    inFlight.current = controller
    setPending(question)
    try {
      show(await aiAnswer(question, controller.signal))
      setPending(undefined)
    } catch {
      // aborted by a newer question, which owns the pending state now
    }
  }

  return (
    // "user": with prefers-reduced-motion, keep fades but drop movement
    <MotionConfig reducedMotion="user">
      <header className="relative isolate overflow-hidden">
        <ShaderBackground pulseKey={current} className="absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-4 pt-16 pb-12">
          <h1 className="text-4xl font-semibold tracking-tight text-balance text-slate-50 sm:text-5xl">
            Ask your data
          </h1>
          <p className="mt-3 max-w-xl text-base text-pretty text-slate-300">
            Ask a question about your money and get a dashboard built for it.
          </p>
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
              aria-label="Your question"
              className="min-w-0 flex-1 rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30 focus:outline-none"
            />
            <button className="flex items-center gap-2 rounded-xl bg-indigo-500 px-5 font-medium text-white shadow-lg shadow-indigo-500/20 transition-colors hover:bg-indigo-400">
              {pending && (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  aria-hidden
                />
              )}
              {pending ? 'Building…' : 'Ask'}
            </button>
          </form>
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {DEMO_QUESTIONS.map((q) => {
              const active = q === (pending ?? current.question)
              return (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  aria-pressed={active}
                  className={`relative shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap backdrop-blur-sm transition-colors ${
                    active
                      ? 'border-indigo-400/60 text-white'
                      : 'border-slate-700/70 bg-slate-950/40 text-slate-300 hover:border-slate-500 hover:text-slate-100'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="active-chip"
                      className="absolute inset-0 -z-10 rounded-full bg-indigo-500/25"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  {q}
                </button>
              )
            })}
          </div>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2.5 text-xs text-slate-400 select-none">
            <input
              type="checkbox"
              role="switch"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <span
              className="relative h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-indigo-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-400 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
              aria-hidden
            />
            AI layouts with Groq
            <span className="text-slate-600">· rule-based router when off or if the AI fails</span>
          </label>
        </div>
      </header>

      <main
        className={`relative mx-auto max-w-6xl px-4 pb-10 transition-opacity duration-300 ${pending ? 'opacity-50' : ''}`}
        aria-busy={!!pending}
      >
        {/* popLayout: the old dashboard fades out of flow while the new one builds in place */}
        <AnimatePresence mode="popLayout">
          <motion.section key={id} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <p className="mb-1 text-sm text-slate-500">{current.question}</p>
              <h2 className="text-xl font-medium tracking-tight text-pretty text-slate-50 sm:text-2xl">
                {current.summary}
              </h2>
              <p className="mt-2 mb-6 flex items-center gap-2 text-xs text-slate-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${built.source === 'ai' ? 'bg-indigo-400' : 'bg-slate-500'}`}
                  aria-hidden
                />
                {built.source === 'ai' ? (
                  <>Layout designed by Groq · {built.model}</>
                ) : (
                  <>
                    Layout by the rule-based router
                    {built.fallbackReason && (
                      <span className="text-slate-600">(AI fallback: {built.fallbackReason})</span>
                    )}
                  </>
                )}
              </p>
            </motion.div>
            <BlockRenderer blocks={current.blocks} />
          </motion.section>
        </AnimatePresence>

        <details className="group mt-10 rounded-2xl border border-slate-800 bg-slate-900/40">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-5 py-4 text-sm text-slate-400 select-none hover:text-slate-200 [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-indigo-300">{'{ }'}</span>
            View the JSON that built this dashboard
            <span className="ml-auto text-slate-600 transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
          </summary>
          <pre className="max-h-[28rem] overflow-auto border-t border-slate-800 px-5 py-4 font-mono text-xs leading-relaxed text-slate-300">
            {JSON.stringify(current, null, 2)}
          </pre>
        </details>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pt-2 pb-12 text-xs text-slate-500">
        Demo data: six months of synthetic transactions (Apr–Sep 2026). Built with React, Recharts, Framer Motion and
        WebGL.{' '}
        <a
          href="https://github.com/Nidhi-2001/generative-dashboard"
          className="text-slate-400 underline decoration-slate-700 underline-offset-2 hover:text-slate-200"
        >
          Source on GitHub
        </a>
      </footer>
    </MotionConfig>
  )
}

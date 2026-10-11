import { useState } from 'react'
import AnswerPanel from './AnswerPanel'
import SourcePanel from './SourcePanel'
import { SAMPLES, type Sample } from '../samples'

interface Props {
  mode: 'pdf' | 'text'
  onModeChange: (mode: 'pdf' | 'text') => void
  file: File | null
  onFileChange: (file: File | null) => void
  fileError: string | null
  onFileError: (message: string | null) => void
  sourceText: string
  onSourceTextChange: (value: string) => void
  answer: string
  onAnswerChange: (value: string) => void
  onAnalyse: () => void
  onReset: () => void
  loading: boolean
}

const STEPS = [
  { n: '1', label: 'Extract claims', detail: 'Split the answer into checkable statements' },
  { n: '2', label: 'Match evidence', detail: 'Locate each quotation in your source' },
  { n: '3', label: 'Rule', detail: 'Propose a verdict per claim, with page refs' },
]

/**
 * The Evidence Desk: one container with a visible seam.
 * Source ~40% (a reference) | Answer ~60% (the subject), so the two no longer
 * read as equal halves of a form. The source collapses to a summary chip once
 * it holds content, giving the answer the space.
 */
export default function InputWorkspace({
  mode,
  onModeChange,
  file,
  onFileChange,
  fileError,
  onFileError,
  sourceText,
  onSourceTextChange,
  answer,
  onAnswerChange,
  onAnalyse,
  onReset,
  loading,
}: Props) {
  const hasSource = mode === 'pdf' ? file !== null : sourceText.trim().length > 0
  const hasAnswer = answer.trim().length > 0
  const answerTooLong = answer.length > 40_000
  const canSubmit = hasSource && hasAnswer && !answerTooLong && !fileError && !loading
  const [collapsed, setCollapsed] = useState(false)

  /** On mobile the desk is two tabs; on desktop both panes are visible. */
  const [mobileTab, setMobileTab] = useState<'source' | 'answer'>('source')
  const showSourcePane = mobileTab === 'source'
  const showAnswerPane = mobileTab === 'answer'

  const loadSample = (sample: Sample) => {
    onModeChange('text')
    onSourceTextChange(sample.source)
    onAnswerChange(sample.answer)
    onFileError(null)
    setCollapsed(false)
    setMobileTab('answer')
  }

  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-4 sm:px-8" aria-label="Evidence desk">
      {/* Example chips */}
      {!hasSource && !hasAnswer && !loading && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[0.8rem] text-ink-faint">Try an example:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSample(s)}
              title={s.hint}
              className="rounded-full border border-line bg-paper px-3 py-1 text-[0.8rem] font-medium text-ink-soft transition-colors hover:border-crimson hover:text-crimson"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobile tabs — the desk becomes Source | Answer below the sm breakpoint */}
      <div className="mb-3 flex gap-1 rounded-[var(--radius-control)] border border-line bg-ivory-deep p-1 sm:hidden" role="group" aria-label="Evidence desk panes">
        {(['source', 'answer'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            aria-pressed={mobileTab === tab}
            className={`flex-1 rounded px-3 py-1.5 text-[0.8rem] font-medium transition-colors ${
              mobileTab === tab ? 'bg-paper text-charcoal shadow-xs' : 'text-ink-soft'
            }`}
          >
            {tab === 'source' ? 'Source' : 'Answer'}
          </button>
        ))}
      </div>

      <div
        className={`grid gap-4 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''} ${
          collapsed ? 'sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]' : 'lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]'
        }`}
      >
        <div className={showSourcePane ? 'contents' : 'hidden sm:contents'}>
          <SourcePanel
            mode={mode}
            onModeChange={onModeChange}
            file={file}
            onFileChange={onFileChange}
            fileError={fileError}
            onFileError={onFileError}
            sourceText={sourceText}
            onSourceTextChange={onSourceTextChange}
            disabled={loading}
            collapsed={collapsed}
            onToggleCollapsed={setCollapsed}
          />
        </div>
        <div className={showAnswerPane ? 'contents' : 'hidden sm:contents'}>
          <AnswerPanel
            answer={answer}
            onChange={onAnswerChange}
            disabled={loading}
            onFocus={() => {
              // The source is a reference; once the user starts writing the
              // answer it collapses to a chip so the subject gets the space.
              if (hasSource && !collapsed) setCollapsed(true)
            }}
          />
        </div>
      </div>

      {/* Docked primary action */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
        <p className="max-w-[38rem] text-[0.8rem] leading-relaxed text-ink-faint">
          {canSubmit
            ? 'Ready. The answer will be split into claims and checked against the source you supplied.'
            : `Provide ${hasSource ? 'the AI answer' : hasAnswer ? 'a source document' : 'a source document and the AI answer'} to begin.`}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={onReset}
            disabled={loading || (!hasSource && !hasAnswer)}
          >
            Clear all
          </button>
          <button
            type="button"
            className="btn btn-primary min-w-[190px]"
            onClick={onAnalyse}
            disabled={!canSubmit}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Auditing…
              </>
            ) : (
              'Analyse answer'
            )}
          </button>
        </div>
      </div>

      {/* Three-step strip */}
      <ol className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li key={step.n} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-charcoal text-[0.68rem] font-bold text-white dark:bg-crimson"
              aria-hidden="true"
            >
              {step.n}
            </span>
            <div>
              <p className="text-[0.85rem] font-semibold text-charcoal">{step.label}</p>
              <p className="text-[0.76rem] leading-relaxed text-ink-faint">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

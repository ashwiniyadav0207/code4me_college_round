interface Props {
  answer: string
  onChange: (value: string) => void
  disabled: boolean
  /** Optional: fired when the user focuses the answer, used to collapse the source. */
  onFocus?: () => void
}

const LIMIT = 40_000

/** The subject of the audit. Deliberately the larger half of the Evidence Desk. */
export default function AnswerPanel({ answer, onChange, disabled, onFocus }: Props) {
  const over = answer.length > LIMIT
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0

  return (
    <section className="panel flex flex-col" aria-labelledby="answer-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <p className="caps text-[0.66rem]">Answer under audit</p>
          <h2 id="answer-heading" className="mt-0.5 text-[1rem] font-semibold leading-tight text-charcoal">
            The claim being checked
          </h2>
        </div>
        <span className="text-[0.75rem] text-ink-faint">Every sentence becomes a claim</span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <label htmlFor="answer-text" className="sr-only">
          AI-generated answer to audit
        </label>
        <textarea
          id="answer-text"
          className={`field min-h-[180px] flex-1 resize-y ${over ? 'border-brick' : ''}`}
          placeholder="Paste the answer another AI produced — it will be split into claims and checked against the source."
          value={answer}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
        />
        <div className="flex items-center justify-between text-[0.76rem]">
          <span className="text-ink-faint">
            {words > 0 ? `${words.toLocaleString()} words` : 'Nothing pasted yet'}
          </span>
          <span className={over ? 'font-medium text-brick' : 'text-ink-faint'}>
            {answer.length.toLocaleString()} / {LIMIT.toLocaleString()} characters
          </span>
        </div>
        {over && (
          <p role="alert" className="text-[0.8rem] font-medium text-brick">
            The answer is longer than the {LIMIT.toLocaleString()}-character limit.
          </p>
        )}
      </div>
    </section>
  )
}

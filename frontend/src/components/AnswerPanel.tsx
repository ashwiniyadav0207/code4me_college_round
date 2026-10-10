interface Props {
  answer: string
  onChange: (value: string) => void
  disabled: boolean
}

const LIMIT = 40_000

export default function AnswerPanel({ answer, onChange, disabled }: Props) {
  const over = answer.length > LIMIT
  return (
    <section className="panel flex flex-col" aria-labelledby="answer-heading">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <p className="caps">Step 2</p>
          <h2 id="answer-heading" className="mt-0.5 text-[1.05rem] leading-tight">
            AI-generated answer
          </h2>
        </div>
        <span className="text-[0.75rem] text-ink-faint">The answer under audit</span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <label htmlFor="answer-text" className="sr-only">
          AI-generated answer to audit
        </label>
        <textarea
          id="answer-text"
          className={`field min-h-[168px] flex-1 resize-y ${over ? 'border-brick' : ''}`}
          placeholder="Paste the answer another AI produced — every sentence will be checked against the source document."
          value={answer}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex items-center justify-between text-[0.76rem]">
          <span className="text-ink-faint">
            {answer.trim().length > 0
              ? `${answer.trim().split(/\s+/).length.toLocaleString()} words`
              : 'Nothing pasted yet'}
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

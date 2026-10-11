const STEPS = [
  { label: 'Extracting claims from the answer', detail: 'Call 1 of 2' },
  { label: 'Verifying each claim against your source', detail: 'Call 2 of 2' },
  { label: 'Validating quotations and page numbers', detail: 'Evidence Guard, in Python' },
]

export default function LoadingState() {
  return (
    <section
      className="mx-auto max-w-[1200px] px-5 pt-10 sm:px-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="panel mx-auto max-w-[36rem] px-6 py-7">
        <p className="caps mb-4">Analysis in progress</p>
        <ol className="space-y-3">
          {STEPS.map((step) => (
            <li key={step.label} className="flex items-start gap-3">
              <span
                className="pulse-dot mt-[0.45rem] h-2 w-2 shrink-0 rounded-full bg-crimson dark:shadow-[0_0_4px_rgba(200,16,46,0.3)]"
                aria-hidden="true"
              />
              <div>
                <p className="text-[0.94rem] font-medium text-charcoal">{step.label}</p>
                <p className="text-[0.75rem] uppercase tracking-[0.05em] text-ink-faint">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full w-1/3 rounded-full bg-crimson dark:shadow-[0_0_5px_rgba(200,16,46,0.3)]"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
        </div>
        <p className="mt-4 text-[0.8rem] text-ink-soft">
          Large documents take longer: the full source is sent to the model so nothing is silently
          dropped.
        </p>
      </div>
    </section>
  )
}

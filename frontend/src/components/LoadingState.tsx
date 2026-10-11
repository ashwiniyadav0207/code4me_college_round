/**
 * Loading state. The Evidence Desk stays visible above and dims; the three
 * stages read as a single line rather than a spinner-only screen.
 *
 * The backend reports two model calls plus the Python Evidence Guard pass, so
 * the labels describe what is actually happening.
 */
const STAGES = [
  { label: 'Reading source', detail: 'Extracting text page by page' },
  { label: 'Extracting claims', detail: 'Model call 1 of 2' },
  { label: 'Verifying quotes', detail: 'Model call 2 of 2, then Evidence Guard' },
]

export default function LoadingState() {
  return (
    <section
      className="mx-auto max-w-[1240px] px-5 pt-3 sm:px-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="panel mx-auto max-w-[42rem] px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
          <p className="caps text-crimson font-semibold">Analysis in progress</p>
          <span className="text-[0.72rem] text-ink-faint">Deterministically checked</span>
        </div>

        <ol className="mt-4 space-y-3">
          {STAGES.map((stage, i) => (
            <li key={stage.label} className="flex items-start gap-3">
              <span
                className="pulse-dot mt-[0.35rem] h-2 w-2 shrink-0 rounded-full bg-crimson dark:shadow-[0_0_4px_rgba(200,16,46,0.3)]"
                aria-hidden="true"
                style={{ animationDelay: `${i * 0.35}s` }}
              />
              <div className="flex-1">
                <p className="text-[0.92rem] font-medium text-charcoal">{stage.label}</p>
                <p className="text-[0.75rem] uppercase tracking-[0.05em] text-ink-faint">
                  {stage.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full w-1/3 rounded-full bg-crimson dark:shadow-[0_0_5px_rgba(200,16,46,0.3)]"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
        </div>

        <p className="mt-3 text-[0.78rem] leading-relaxed text-ink-faint">
          Large documents take longer: the full source is sent to the model so nothing is silently
          dropped. Nothing has been audited yet — the results appear below when it finishes.
        </p>
      </div>
    </section>
  )
}

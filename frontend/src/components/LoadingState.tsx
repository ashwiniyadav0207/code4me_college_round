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
      className="mx-auto max-w-[1240px] px-5 pt-2 sm:px-8"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="rounded-[var(--radius-card)] border border-line bg-paper px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="caps shrink-0 text-crimson font-semibold">Auditing</p>

          <ol className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
            {STAGES.map((stage, i) => (
              <li key={stage.label} className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-crimson"
                    aria-hidden="true"
                    style={{ animationDelay: `${i * 0.35}s` }}
                  />
                  <span className="text-[0.88rem] font-medium text-charcoal">{stage.label}</span>
                </span>
                <span className="hidden text-[0.74rem] text-ink-faint md:inline">· {stage.detail}</span>
                {i < STAGES.length - 1 && (
                  <span className="ml-3 hidden h-px w-6 bg-line md:inline-block" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-3 text-[0.78rem] leading-relaxed text-ink-faint">
          Large documents take longer: the full source is sent to the model so nothing is silently
          dropped. Nothing has been audited yet — the results appear below when it finishes.
        </p>
      </div>
    </section>
  )
}

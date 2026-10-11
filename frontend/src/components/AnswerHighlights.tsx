import type { Claim } from '../types'
import { highlightClass } from '../types'

interface Props {
  answer: string
  claims: Claim[]
  /** Currently selected claim, highlighted in the reading surface. */
  selectedId?: string | null
  onSelectClaim?: (id: string) => void
}

interface Segment {
  start: number
  end: number
  claim: Claim | null
}

/**
 * The Annotated Answer: the reading surface.
 *
 * Highlights only spans the backend verified point at the claim's own words.
 * When span mapping is unavailable the answer is shown untouched — no
 * highlighting is invented.
 */
export default function AnswerHighlights({ answer, claims, selectedId, onSelectClaim }: Props) {
  const spans = claims
    .filter(
      (c) =>
        typeof c.span_start === 'number' &&
        typeof c.span_end === 'number' &&
        c.span_start < c.span_end &&
        answer.slice(c.span_start, c.span_end).trim().length > 0,
    )
    .map((c) => ({ start: c.span_start as number, end: c.span_end as number, claim: c }))
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const kept: Segment[] = []
  let cursor = -1
  for (const span of spans) {
    if (span.start >= cursor) {
      kept.push(span)
      cursor = span.end
    }
  }

  const segments: Segment[] = []
  let pos = 0
  for (const span of kept) {
    if (span.start > pos) segments.push({ start: pos, end: span.start, claim: null })
    segments.push(span)
    pos = span.end
  }
  if (pos < answer.length) segments.push({ start: pos, end: answer.length, claim: null })

  const annotated = segments.some((s) => s.claim !== null)

  return (
    <section className="panel" aria-labelledby="answer-review-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <p className="caps text-[0.66rem]">Answer under audit</p>
          <h2 id="answer-review-heading" className="mt-0.5 text-[1rem] font-semibold leading-tight text-charcoal">
            Original wording, unedited
          </h2>
        </div>
        <p className="text-[0.74rem] text-ink-faint">
          {annotated
            ? 'Highlighted spans map exactly to the claim text. Select one to inspect it.'
            : 'Span mapping was not available for this run, so no highlighting is shown.'}
        </p>
      </div>

      <div className="px-5 py-5">
        <p className="whitespace-pre-wrap text-[1rem] leading-[1.8] text-charcoal">
          {segments.map((seg, i) =>
            seg.claim ? (
              <button
                key={`${seg.claim.id}-${i}`}
                type="button"
                className={`hl ${highlightClass(seg.claim.verdict)} ${
                  selectedId === seg.claim.id ? 'ring-2 ring-charcoal ring-offset-1' : ''
                }`}
                title={`${seg.claim.verdict} — ${seg.claim.claim_text}`}
                onClick={() => onSelectClaim?.(seg.claim!.id)}
              >
                {answer.slice(seg.start, seg.end)}
              </button>
            ) : (
              <span key={`t-${i}`}>{answer.slice(seg.start, seg.end)}</span>
            ),
          )}
        </p>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-[0.76rem] text-ink-soft">
          {[
            ['hl-supported', 'Supported'],
            ['hl-contradicted', 'Contradicted'],
            ['hl-not-stated', 'Not stated in source'],
            ['hl-ambiguous', 'Ambiguous / conflicting'],
          ].map(([cls, label]) => (
            <li key={label} className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-5 rounded-xs ${cls}`} aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

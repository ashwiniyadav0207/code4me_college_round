import { useState } from 'react'
import type { Claim } from '../types'
import { evidenceStatusLabel, verdictClass } from '../types'

interface Props {
  claim: Claim
  index: number
}

function statusDot(status: string): string {
  switch (status) {
    case 'verified':
      return 'bg-forest'
    case 'partial':
      return 'bg-amber'
    case 'unverified':
    case 'missing':
      return 'bg-brick'
    default:
      return 'bg-ink-faint'
  }
}

function statusColour(status: string): string {
  switch (status) {
    case 'verified':
      return 'text-forest'
    case 'partial':
      return 'text-amber'
    case 'unverified':
    case 'missing':
      return 'text-brick'
    default:
      return 'text-ink-soft'
  }
}

export default function ClaimCard({ claim, index }: Props) {
  const [open, setOpen] = useState(claim.needs_review || claim.evidence_status === 'unverified')
  const evidence = claim.evidence ?? []
  const pages = Array.from(
    new Set(evidence.filter((e) => e.verified && e.page).map((e) => e.page as number)),
  )

  return (
    <article
      id={`claim-${claim.id}`}
      tabIndex={-1}
      className="panel scroll-mt-6 outline-none"
      aria-labelledby={`claim-${claim.id}-text`}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 ${
          claim.needs_review ? 'bg-amber-surface/60' : ''
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-[0.85rem] text-ink-faint">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span
            className={`border px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.09em] ${verdictClass(claim.verdict)}`}
          >
            {claim.verdict}
          </span>
          <span className="border border-line-strong px-2 py-1 text-[0.68rem] font-medium uppercase tracking-[0.09em] text-ink-soft">
            {claim.claim_type}
          </span>
        </div>
        <span className="text-[0.72rem] tracking-[0.05em] text-ink-faint">
          {claim.id} · span{' '}
          {claim.span_start !== null && claim.span_end !== null
            ? `${claim.span_start}–${claim.span_end}`
            : 'unmapped'}
        </span>
      </div>

      <div className="px-5 py-4">
        <p className="caps mb-2">Claim</p>
        <p id={`claim-${claim.id}-text`} className="font-display text-[1.06rem] leading-relaxed">
          {claim.claim_text}
        </p>

        <p className="caps mt-4 mb-1.5">Explanation</p>
        <p className="text-[0.92rem] leading-relaxed text-ink-soft">
          {claim.explanation || 'The model returned no explanation for this claim.'}
        </p>

        {claim.needs_review && claim.review_reason && (
          <div className="mt-4 border-l-2 border-amber bg-amber-surface/70 px-4 py-3">
            <p className="caps mb-1 text-amber">Human review required</p>
            <p className="text-[0.87rem] leading-relaxed text-charcoal">{claim.review_reason}</p>
          </div>
        )}
      </div>

      <div className="border-t border-line px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${statusDot(claim.evidence_status)}`}
              aria-hidden="true"
            />
            <span
              className={`text-[0.8rem] font-semibold ${statusColour(claim.evidence_status)}`}
            >
              {evidenceStatusLabel(claim.evidence_status)}
            </span>
            {pages.length > 0 && (
              <span className="text-[0.8rem] text-ink-soft">
                · {pages.map((p) => `p. ${p}`).join(', ')}
              </span>
            )}
          </div>
          <span className="text-[0.7rem] uppercase tracking-[0.09em] text-ink-faint">
            Verdict proposed by model · quotes checked by app
          </span>
        </div>

        {evidence.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {evidence.map((ev, i) => (
              <li
                key={i}
                className={`border-l-2 pl-4 ${ev.verified ? 'border-forest' : 'border-brick'}`}
              >
                <p className="quote">
                  <span aria-hidden="true" className="text-ink-faint">
                    “
                  </span>
                  {ev.quote}
                  <span aria-hidden="true" className="text-ink-faint">
                    ”
                  </span>
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.76rem]">
                  <span className="font-semibold text-charcoal">
                    {ev.page !== null ? `Page ${ev.page}` : 'Page not located'}
                  </span>
                  <span className={ev.verified ? 'text-forest' : 'text-brick'}>
                    {ev.verified
                      ? 'Found in the extracted source text'
                      : 'Not found in the extracted source text'}
                  </span>
                  {!ev.verified && (
                    <span className="text-ink-faint">unusable as evidence</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[0.85rem] leading-relaxed text-ink-soft">
            {claim.evidence_note ??
              'No quotation supplied for this claim.'}
          </p>
        )}

        <details className="mt-4 border-t border-line pt-3" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer text-[0.78rem] font-semibold tracking-[0.05em] uppercase text-ink-soft hover:text-forest">
            Validation detail
          </summary>
          <div className="mt-2 space-y-1.5 text-[0.8rem] leading-relaxed text-ink-soft">
            {evidence.map((ev, i) => (
              <p key={i}>
                <span className="font-semibold text-charcoal">Quote {i + 1}:</span> {ev.note}
                {ev.model_page !== null && ev.page !== null && ev.model_page !== ev.page && (
                  <span className="text-amber">
                    {' '}
                    The model reported page {ev.model_page}; this app computed page {ev.page}.
                  </span>
                )}
              </p>
            ))}
            {claim.evidence_note && <p>{claim.evidence_note}</p>}
            <p className="text-ink-faint">
              Verdict by the model ({claim.claim_type}); quotation existence and page number
              computed by this application. Matching text does not by itself prove the claim.
            </p>
          </div>
        </details>
      </div>
    </article>
  )
}

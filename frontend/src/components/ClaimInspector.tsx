import { useState } from 'react'
import type { Claim } from '../types'
import VerdictChip, { normaliseVerdict } from './VerdictChip'
import TruthRepairCard from './TruthRepairCard'

interface Props {
  claim: Claim
  index: number
  answer?: string
  sourceText?: string
  file?: File | null
  onOpenCourtroom?: (claim: Claim) => void
}

/**
 * The Claim Inspector: one structure, not a stack of equal-weight boxes.
 *
 *   claim + verdict chip → why (2 lines, expandable) → one evidence strip →
 *   one action row.
 *
 * "Needs review" is a flag on the chip. Advanced validation detail lives in a
 * collapsed Audit details drawer at the bottom.
 */
export default function ClaimInspector({ claim, index, answer, sourceText, file, onOpenCourtroom }: Props) {
  const [whyOpen, setWhyOpen] = useState(false)
  const [repairOpen, setRepairOpen] = useState(false)
  const [auditOpen, setAuditOpen] = useState(false)

  const evidence = claim.evidence ?? []
  const verdict = normaliseVerdict(String(claim.verdict))
  const showOriginalVerdict = claim.model_verdict !== undefined && claim.model_verdict !== claim.verdict

  return (
    <article
      id={`claim-${claim.id}`}
      tabIndex={-1}
      className="panel scroll-mt-32 outline-none"
      aria-labelledby={`claim-${claim.id}-text`}
    >
      <div className="px-5 py-5">
        {/* 1. Claim text + verdict chip */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[0.72rem] font-bold text-ink-faint">
            #{String(index + 1).padStart(2, '0')}
          </span>
          <VerdictChip verdict={verdict} needsReview={claim.needs_review} size="sm" />
          <span className="rounded border border-line px-1.5 py-0.5 text-[0.66rem] font-medium uppercase tracking-wider text-ink-faint">
            {claim.claim_type}
          </span>
        </div>

        <p
          id={`claim-${claim.id}-text`}
          className="quote mt-3 text-[1.2rem] font-normal leading-[1.5] text-charcoal"
        >
          “{claim.claim_text}”
        </p>

        {/* 2. Why — 2 lines, expandable */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="caps text-[0.66rem]">Why</span>
            <button
              type="button"
              onClick={() => setWhyOpen((v) => !v)}
              aria-expanded={whyOpen}
              className="text-[0.72rem] font-medium text-ink-soft underline underline-offset-2 hover:text-crimson"
            >
              {whyOpen ? 'Less' : 'More'}
            </button>
          </div>
          <p
            className={`mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft ${
              whyOpen ? '' : 'line-clamp-2'
            }`}
          >
            {claim.explanation || 'The model returned no explanation for this claim.'}
          </p>
          {claim.needs_review && claim.review_reason && whyOpen && (
            <p className="mt-2 rounded-[var(--radius-control)] border-l-2 border-amber bg-amber-surface px-3 py-2 text-[0.8rem] leading-relaxed text-charcoal">
              <span className="font-semibold text-amber">Flagged for review: </span>
              {claim.review_reason}
            </p>
          )}
        </div>

        {/* 3. Evidence strip — the hero of the card */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="caps text-[0.66rem]">Evidence</span>
            <span
              className={`text-[0.76rem] font-semibold ${
                evidence.some((e) => e.verified)
                  ? 'text-forest'
                  : evidence.length > 0
                  ? 'text-brick'
                  : 'text-ink-faint'
              }`}
            >
              {evidence.length === 0
                ? 'No quotation supplied'
                : evidence.some((e) => e.verified)
                ? `Quote found in source${evidence.find((e) => e.verified)?.page ? `, p.${evidence.find((e) => e.verified)?.page}` : ''}`
                : 'Quote not found'}
            </span>
          </div>

          {evidence.length > 0 ? (
            <div className="mt-2.5 space-y-2.5">
              {evidence.map((ev, i) => (
                <div key={i} className="quote-block" data-verified={ev.verified}>
                  <blockquote className="quote text-[1rem] leading-[1.55] text-charcoal">
                    “{ev.quote}”
                  </blockquote>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.76rem]">
                    <span className="font-mono text-ink-soft">
                      {ev.page !== null ? `p.${ev.page}` : 'page not located'}
                    </span>
                    <span className={`font-semibold ${ev.verified ? 'text-forest' : 'text-brick'}`}>
                      {ev.verified ? 'Verified in source' : 'Not found in source'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-faint">
              {claim.evidence_status === 'missing'
                ? 'No matching evidence quotation was found in the supplied source.'
                : claim.evidence_note ?? 'No quotation supplied for this claim.'}
            </p>
          )}

          {/* Fixed honesty caption — never changes */}
          <p className="mt-2.5 text-[0.74rem] leading-relaxed text-ink-faint">
            A found quote shows the source says this. It does not prove the claim.
          </p>
        </div>

        {/* 4. Action row — exactly two actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
          {onOpenCourtroom && (
            <button
              type="button"
              onClick={() => onOpenCourtroom(claim)}
              className="btn btn-primary !py-1.5 !px-3.5 text-[0.82rem]"
              title="Stage a hearing: prosecutor, defender and judge for this claim"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M8 2v12M3 5h10M5 5l-2 4h4zM11 5l-2 4h4z" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              Open hearing
            </button>
          )}
          <button
            type="button"
            onClick={() => setRepairOpen((v) => !v)}
            aria-expanded={repairOpen}
            className="btn btn-outline !py-1.5 !px-3.5 text-[0.82rem]"
            title="Ask for a source-grounded replacement, or an honest decline"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M11.5 2.5l2 2L6 12l-3 1 1-3z" strokeLinejoin="round" />
            </svg>
            Truth Repair
          </button>

          {showOriginalVerdict && (
            <span className="ml-auto text-[0.7rem] text-ink-faint">
              Safeguard adjusted a model verdict
            </span>
          )}
        </div>

        {/* Truth Repair workbench (inline; the drawer variant is the same component) */}
        {repairOpen && (
          <TruthRepairCard
            claim={claim}
            answer={answer}
            sourceText={sourceText ?? ''}
            file={file ?? null}
            variant="drawer"
            onClose={() => setRepairOpen(false)}
          />
        )}

        {/* Audit details drawer — advanced validation, collapsed by default */}
        <details
          className="mt-4 border-t border-line pt-3"
          open={auditOpen}
          onToggle={(e) => setAuditOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer text-[0.72rem] font-medium text-ink-faint hover:text-charcoal">
            Audit details
          </summary>
          <dl className="mt-2 space-y-1.5 text-[0.75rem] text-ink-soft">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-semibold text-charcoal">Claim id</dt>
              <dd className="font-mono">{claim.id}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-semibold text-charcoal">Span</dt>
              <dd className="font-mono">
                {claim.span_start !== null && claim.span_end !== null
                  ? `${claim.span_start}–${claim.span_end}`
                  : 'unmapped'}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 font-semibold text-charcoal">Evidence</dt>
              <dd>{claim.evidence_status}</dd>
            </div>
            {showOriginalVerdict && (
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 font-semibold text-amber">Safeguard</dt>
                <dd>
                  Model proposed “{claim.model_verdict}”; evidence guard recorded “
                  {String(claim.verdict)}”.
                  {claim.review_reason ? ` ${claim.review_reason}` : ''}
                </dd>
              </div>
            )}
            {evidence.map((ev, i) => (
              <div key={i} className="flex gap-2 border-t border-line/60 pt-1.5">
                <dt className="w-24 shrink-0 font-semibold text-charcoal">Quote #{i + 1}</dt>
                <dd>
                  {ev.note}
                  {ev.model_page !== null && ev.page !== null && ev.model_page !== ev.page && (
                    <span className="mt-0.5 block text-amber">
                      Model claimed p.{ev.model_page}; recomputed p.{ev.page}.
                    </span>
                  )}
                </dd>
              </div>
            ))}
            {claim.evidence_note && <div className="border-t border-line/60 pt-1.5">{claim.evidence_note}</div>}
          </dl>
        </details>
      </div>
    </article>
  )
}

import { useState } from 'react'
import type { Claim } from '../types'
import { evidenceStatusLabel, verdictClass } from '../types'
import TruthRepairCard from './TruthRepairCard'

interface Props {
  claim: Claim
  index: number
  answer?: string
  sourceText?: string
  file?: File | null
  onOpenCourtroom?: (claim: Claim) => void
}

function statusDot(status: string): string {
  switch (status) {
    case 'verified':
      return 'bg-forest dark:bg-emerald-400'
    case 'partial':
      return 'bg-amber dark:bg-amber-400'
    case 'unverified':
    case 'missing':
      return 'bg-brick dark:bg-rose-500'
    default:
      return 'bg-ink-faint'
  }
}

function statusColour(status: string): string {
  switch (status) {
    case 'verified':
      return 'text-forest dark:text-emerald-400'
    case 'partial':
      return 'text-amber dark:text-amber-400'
    case 'unverified':
    case 'missing':
      return 'text-brick dark:text-rose-400'
    default:
      return 'text-ink-soft dark:text-gray-400'
  }
}

function verdictLabel(verdict: string): string {
  const value = verdict.trim().toLowerCase().replace(/[_-]+/g, ' ')

  switch (value) {
    case 'supported':
      return 'Supported'
    case 'contradicted':
      return 'Contradicted'
    case 'not stated':
    case 'not stated in source':
    case 'not found in source':
      return 'Not stated in source'
    case 'ambiguous':
    case 'conflicting':
    case 'ambiguous/conflicting':
    case 'ambiguous or conflicting':
      return 'Ambiguous/conflicting'
    default:
      return verdict
  }
}

export default function ClaimCard({
  claim,
  index,
  answer,
  sourceText,
  file,
  onOpenCourtroom,
}: Props) {
  const [open, setOpen] = useState(
    claim.needs_review || claim.evidence_status === 'unverified',
  )

  const evidence = claim.evidence ?? []

  const pages = Array.from(
    new Set(
      evidence
        .filter((e) => e.verified && e.page)
        .map((e) => e.page as number),
    ),
  )

  const showOriginalVerdict =
    claim.model_verdict !== undefined &&
    claim.model_verdict !== claim.verdict

  return (
    <article
      id={`claim-${claim.id}`}
      tabIndex={-1}
      className="panel scroll-mt-6 outline-none transition-all duration-200 hover:border-line-strong hover:shadow-md dark:hover:border-[#3d335c]"
      aria-labelledby={`claim-${claim.id}-text`}
    >
      {/* 1. Header Bar: Order, Claim Type, Verdict Seal, Span */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 ${
          claim.needs_review ? 'bg-amber-surface/70 dark:bg-amber-950/25' : 'bg-ivory-deep/30 dark:bg-[#120f20]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs font-bold text-ink-faint">
            #{String(index + 1).padStart(2, '0')}
          </span>

          {/* Prominent Verdict Seal */}
          <span
            className={`docket-stamp inline-flex items-center rounded px-3 py-1 text-xs font-bold shadow-xs ${verdictClass(
              claim.verdict,
            )}`}
            role="status"
            aria-label={`Final claim verdict: ${verdictLabel(String(claim.verdict))}`}
          >
            {verdictLabel(String(claim.verdict))}
          </span>

          {showOriginalVerdict && (
            <span className="rounded border border-amber/40 bg-amber-surface px-2 py-0.5 text-[0.68rem] font-bold text-amber dark:bg-amber-950/50">
              Audit Safeguard Downgrade
            </span>
          )}

          <span className="rounded border border-line-strong px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-ink-soft dark:border-[#382f54]">
            {claim.claim_type}
          </span>
        </div>

        <span className="font-mono text-[0.7rem] text-ink-faint">
          {claim.id} · span{' '}
          {claim.span_start !== null && claim.span_end !== null
            ? `${claim.span_start}–${claim.span_end}`
            : 'unmapped'}
        </span>
      </div>

      {/* 2. Claim Statement & Explanation */}
      <div className="px-6 py-5">
        <h4 className="caps text-[0.7rem] text-ink-faint mb-1.5 font-bold">
          Claim Under Scrutiny
        </h4>
        <p
          id={`claim-${claim.id}-text`}
          className="font-serif text-[1.12rem] font-medium leading-relaxed text-charcoal sm:text-[1.18rem] dark:text-[#f8f6f0]"
        >
          “{claim.claim_text}”
        </p>

        <div className="mt-4 rounded-lg bg-ivory-deep/40 p-3.5 border border-line/60 dark:bg-[#141022] dark:border-[#251e38]">
          <span className="caps text-[0.68rem] text-ink-faint block mb-1 font-bold">
            Auditing Rationale
          </span>
          <p className="text-sm leading-relaxed text-ink-soft dark:text-gray-300">
            {claim.explanation || 'The model returned no explanation for this claim.'}
          </p>
        </div>

        {/* Audit Trail Banner (Model Verdict Downgrade) */}
        {showOriginalVerdict && (
          <div className="mt-4 rounded-xl border-2 border-amber/60 bg-amber-surface/90 p-4 text-xs dark:bg-amber-950/30 dark:border-amber-500/40">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber">
              <span>⚠</span>
              <span>Evidence Guard Audit Trail</span>
            </div>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-paper p-2.5 border border-line shadow-2xs dark:bg-[#181329] dark:border-[#332b4a]">
                <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-ink-faint">
                  Proposed By Model
                </span>
                <span className="mt-0.5 block font-bold text-charcoal dark:text-gray-200">
                  {verdictLabel(String(claim.model_verdict))}
                </span>
              </div>
              <div className="rounded-lg bg-paper p-2.5 border border-line shadow-2xs dark:bg-[#181329] dark:border-[#332b4a]">
                <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-ink-faint">
                  Downgrade Reason
                </span>
                <span className="mt-0.5 block font-medium text-ink-soft dark:text-gray-300">
                  {claim.review_reason || 'Supporting quotations could not be verified in source'}
                </span>
              </div>
              <div className="rounded-lg bg-paper p-2.5 border border-line shadow-2xs dark:bg-[#181329] dark:border-[#332b4a]">
                <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-ink-faint">
                  Enforced Verdict
                </span>
                <span className="mt-0.5 block font-bold text-amber">
                  {verdictLabel(String(claim.verdict))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Human Review Banner */}
        {claim.needs_review && (
          <div className="mt-4 rounded-lg border-l-4 border-amber bg-amber-surface p-3.5 text-xs">
            <div className="font-bold text-amber uppercase tracking-wider">
              Human Review Required
            </div>
            <p className="mt-1 text-charcoal leading-relaxed dark:text-amber-100">
              {claim.review_reason || 'This claim has been flagged for human verification.'}
            </p>
          </div>
        )}
      </div>

      {/* 3. Evidence Quotation Exhibits */}
      <div className="border-t border-line px-6 py-4 bg-paper dark:bg-[#151124]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(claim.evidence_status)}`}
              aria-hidden="true"
            />
            <span className={`text-xs font-bold uppercase tracking-wider ${statusColour(claim.evidence_status)}`}>
              {evidenceStatusLabel(claim.evidence_status)}
            </span>
            {pages.length > 0 && (
              <span className="text-xs font-medium text-ink-soft dark:text-gray-400">
                · {pages.map((p) => `Page ${p}`).join(', ')}
              </span>
            )}
          </div>

          <span className="text-[0.68rem] text-ink-faint">
            Verified with Python Evidence Guard
          </span>
        </div>

        {evidence.length > 0 ? (
          <div className="mt-3.5 space-y-3">
            {evidence.map((ev, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3.5 text-xs transition-all ${
                  ev.verified
                    ? 'border-l-4 border-l-forest bg-sage-soft/50 border-line/80 dark:border-l-emerald-400 dark:bg-emerald-950/20 dark:border-[#2b2442]'
                    : 'border-l-4 border-l-brick bg-brick-surface/50 border-line/80 dark:border-l-rose-500 dark:bg-rose-950/20 dark:border-[#2b2442]'
                }`}
              >
                <blockquote className="font-serif italic text-sm text-charcoal leading-relaxed dark:text-gray-100">
                  “{ev.quote}”
                </blockquote>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/50 pt-2 text-[0.72rem]">
                  <span className="font-semibold text-charcoal dark:text-gray-300">
                    {ev.page !== null ? `Source Page ${ev.page}` : 'Page not located'}
                  </span>

                  <span
                    className={
                      ev.verified
                        ? 'font-bold text-forest dark:text-emerald-400'
                        : 'font-bold text-brick dark:text-rose-400'
                    }
                  >
                    {ev.verified
                      ? '✓ Verified in source document'
                      : '✕ Not found in source (unverified citation)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-ink-soft italic dark:text-gray-400">
            {claim.evidence_status === 'missing'
              ? 'No matching evidence quotation was found in the supplied source.'
              : claim.evidence_note ?? 'No quotation supplied for this claim.'}
          </p>
        )}

        {/* 4. Action Dock: Truth Repair & AI Courtroom */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenCourtroom && (
              <button
                type="button"
                onClick={() => onOpenCourtroom(claim)}
                className="btn btn-primary text-xs !py-1.5 !px-3.5 font-bold shadow-xs transition-transform active:scale-95"
                title="Stage an adversarial hearing with prosecutor, defender, and judge"
              >
                <span className="text-sm">⚖</span>
                <span>Stage AI Courtroom</span>
              </button>
            )}
          </div>

          <details
            className="text-right"
            open={open}
            onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-[0.72rem] font-bold uppercase tracking-wider text-ink-faint hover:text-crimson dark:hover:text-[#ff1744]">
              {open ? 'Hide Citation Audit' : 'Show Citation Audit'}
            </summary>
            <div className="mt-2 text-left space-y-1.5 text-[0.75rem] text-ink-soft bg-ivory-deep/60 p-3 rounded-lg border border-line dark:bg-[#141022] dark:border-[#2b2442]">
              {evidence.map((ev, i) => (
                <div key={i}>
                  <strong className="text-charcoal dark:text-gray-200">Quote #{i + 1}:</strong> {ev.note}
                  {ev.model_page !== null && ev.page !== null && ev.model_page !== ev.page && (
                    <span className="text-amber block mt-0.5">
                      Model claimed Page {ev.model_page}; calculated Page {ev.page}.
                    </span>
                  )}
                </div>
              ))}
              {claim.evidence_note && <div>{claim.evidence_note}</div>}
            </div>
          </details>
        </div>

        {/* Integrated Truth Repair Workbench */}
        <TruthRepairCard
          claim={claim}
          answer={answer}
          sourceText={sourceText ?? ''}
          file={file ?? null}
        />
      </div>
    </article>
  )
}

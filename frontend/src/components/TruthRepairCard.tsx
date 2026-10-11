import { useState } from 'react'
import { repairClaim } from '../api'
import type { Claim, Evidence, RepairResult } from '../types'

interface Props {
  claim: Claim
  answer?: string
  sourceText: string
  file: File | null
  /** "inline" keeps the original compact card; "drawer" is the 480px workbench. */
  variant?: 'inline' | 'drawer'
  onClose?: () => void
}

/** Word-level diff so changed words read as struck / underlined, not whole blocks. */
function diffWords(before: string, after: string) {
  const beforeWords = before.split(/\s+/).filter(Boolean)
  const afterWords = after.split(/\s+/).filter(Boolean)
  const afterSet = new Set(afterWords.map((w) => w.toLowerCase().replace(/[^\w]/g, '')))

  const beforeParts = beforeWords.map((w) => ({
    w,
    removed: !afterSet.has(w.toLowerCase().replace(/[^\w]/g, '')),
  }))

  const beforeSet = new Set(beforeWords.map((w) => w.toLowerCase().replace(/[^\w]/g, '')))
  const afterParts = afterWords.map((w) => ({
    w,
    added: !beforeSet.has(w.toLowerCase().replace(/[^\w]/g, '')),
  }))

  return { beforeParts, afterParts }
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  if (!evidence || evidence.length === 0) return null
  return (
    <ul className="space-y-2">
      {evidence.map((ev, i) => (
        <li key={i} className="quote-block" data-verified={ev.verified}>
          <p className="quote text-[0.95rem] leading-[1.5] text-charcoal">“{ev.quote}”</p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[0.74rem]">
            <span className="font-mono text-ink-soft">{ev.page !== null ? `p.${ev.page}` : 'page not located'}</span>
            <span className={`font-semibold ${ev.verified ? 'text-forest' : 'text-brick'}`}>
              {ev.verified ? 'Verified in source' : 'Not found in source'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Truth Repair workbench.
 *
 * Honesty rules enforced by the backend and mirrored here:
 *  - the original claim is never overwritten; the default state is "keep original";
 *  - a replacement is only rendered when status === "repaired", which the
 *    backend guarantees means every supporting quote verified;
 *  - an insufficient-evidence result shows NO suggested wording at all.
 */
export default function TruthRepairCard({ claim, answer, sourceText, file, variant = 'inline', onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RepairResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'text' | 'diff' | null>(null)
  const [isOpen, setIsOpen] = useState(variant === 'inline' ? false : true)

  const drawer = variant === 'drawer'

  const handleRunRepair = async () => {
    setIsOpen(true)
    if (result) return
    setLoading(true)
    setError(null)
    try {
      const data = await repairClaim({
        claimText: claim.claim_text,
        answer,
        claimType: claim.claim_type,
        originalVerdict: claim.verdict,
        sourceText,
        file,
      })
      setResult(data)
    } catch (err: any) {
      setError(err?.message || 'Truth repair failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copy = async (text: string, kind: 'text' | 'diff') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      // clipboard unavailable — the button simply does not confirm
    }
  }

  const diffText =
    result?.suggested_replacement && result.original_claim
      ? `- ${result.original_claim}\n+ ${result.suggested_replacement}`
      : ''

  const repaired = result?.status === 'repaired' && Boolean(result?.suggested_replacement)
  const parts =
    repaired && result ? diffWords(result.original_claim, result.suggested_replacement as string) : null

  const body = (
    <>
      {loading && (
        <div className="py-6 text-center" aria-live="polite">
          <div className="spinner mx-auto mb-2.5 h-5 w-5" />
          <p className="text-[0.85rem] font-medium text-charcoal">Searching the source for a grounded correction…</p>
          <p className="mt-1 text-[0.74rem] text-ink-faint">Every quotation is re-checked by the Evidence Guard.</p>
        </div>
      )}

      {error && (
        <div className="rounded-[var(--radius-control)] border border-brick/40 bg-brick-surface p-3.5 text-[0.82rem]">
          <p className="font-semibold text-brick">Repair could not run</p>
          <p className="mt-1 leading-relaxed text-charcoal">{error}</p>
          <button type="button" onClick={handleRunRepair} className="btn btn-outline mt-2 !py-1 !px-3 text-[0.78rem]">
            Retry
          </button>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {repaired && result.suggested_replacement && parts ? (
            <>
              {/* Before / After — the original is never overwritten */}
              <div className="space-y-3">
                <div className="rounded-[var(--radius-control)] border border-line bg-ivory-deep p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="caps text-[0.64rem]">Before — your original claim</span>
                    {result.original_verdict && (
                      <span className="rounded border border-line bg-paper px-1.5 py-0.5 text-[0.66rem] font-medium text-ink-soft">
                        {result.original_verdict}
                      </span>
                    )}
                  </div>
                  <p className="quote text-[0.98rem] leading-[1.5] text-charcoal">
                    {parts.beforeParts.map((p, i) => (
                      <span key={i} className={p.removed ? 'bg-brick-surface text-brick line-through decoration-brick decoration-2' : undefined}>
                        {p.w}{' '}
                      </span>
                    ))}
                  </p>
                </div>

                <div className="rounded-[var(--radius-control)] border border-forest/40 bg-sage-soft p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="caps text-[0.64rem] text-forest">After — suggested wording</span>
                    <button
                      type="button"
                      onClick={() => copy(result.suggested_replacement as string, 'text')}
                      className="rounded border border-forest/40 bg-paper px-2 py-0.5 text-[0.68rem] font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
                    >
                      {copied === 'text' ? 'Copied' : 'Copy corrected wording'}
                    </button>
                  </div>
                  <p className="quote text-[0.98rem] leading-[1.5] text-charcoal">
                    {parts.afterParts.map((p, i) => (
                      <span key={i} className={p.added ? 'bg-forest/15 text-forest underline decoration-forest decoration-2 underline-offset-2' : undefined}>
                        {p.w}{' '}
                      </span>
                    ))}
                  </p>
                  <p className="mt-2 text-[0.72rem] text-ink-faint">
                    Your original claim is unchanged. Nothing is applied until you copy it.
                  </p>
                </div>
              </div>

              <div>
                <span className="caps text-[0.64rem]">Why</span>
                <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-soft">{result.explanation}</p>
              </div>

              <div>
                <span className="caps text-[0.64rem]">Evidence</span>
                <div className="mt-1.5">
                  <EvidenceList evidence={result.evidence} />
                </div>
                <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-faint">
                  A found quote shows the source says this. It does not prove the corrected claim.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => copy(result.suggested_replacement as string, 'text')}
                  className="btn btn-primary !py-1.5 !px-3 text-[0.8rem]"
                >
                  {copied === 'text' ? '✓ Copied' : 'Copy corrected wording'}
                </button>
                <button
                  type="button"
                  onClick={() => copy(diffText, 'diff')}
                  className="btn btn-outline !py-1.5 !px-3 text-[0.8rem]"
                >
                  {copied === 'diff' ? '✓ Copied' : 'Copy as diff'}
                </button>
                {onClose && (
                  <button type="button" onClick={onClose} className="btn btn-quiet !text-[0.8rem]">
                    Dismiss
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Insufficient evidence: no After block, no suggested wording at all */
            <div className="rounded-[var(--radius-control)] border border-line bg-ivory-deep p-4">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3.5M8 10.8v.4" strokeLinecap="round" />
                </svg>
                <span className="text-[0.85rem] font-semibold text-charcoal">Insufficient evidence</span>
              </div>
              <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">
                The supplied source doesn't contain enough to correct this claim. Nothing was changed.
              </p>
              {result?.explanation && (
                <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-faint">{result.explanation}</p>
              )}
              {result && result.evidence.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <span className="caps text-[0.64rem]">What the source does say</span>
                  <div className="mt-1.5">
                    <EvidenceList evidence={result.evidence} />
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setResult(null)} className="btn btn-outline !py-1.5 !px-3 text-[0.8rem]">
                  Try with more source text
                </button>
                <span className="self-center text-[0.74rem] text-ink-faint">
                  or mark this claim for human review.
                </span>
              </div>
            </div>
          )}

          {result.note && (
            <p className="border-t border-line pt-2.5 text-[0.7rem] leading-relaxed text-ink-faint">{result.note}</p>
          )}
        </div>
      )}
    </>
  )

  // Drawer variant: a right-side workbench panel.
  if (drawer) {
    return (
      <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-paper" role="region" aria-label="Truth repair workbench">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <span className="caps text-[0.64rem]">Proposed correction</span>
            <p className="mt-0.5 max-w-[34ch] truncate text-[0.85rem] font-medium text-charcoal">
              “{claim.claim_text}”
            </p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="btn btn-quiet !text-[0.78rem]" aria-label="Close truth repair">
              Close
            </button>
          )}
        </div>
        <div className="p-4">{body}</div>
      </div>
    )
  }

  // Inline variant: the original trigger card.
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleRunRepair}
        className="btn btn-outline mt-3.5 w-full !py-1.5 text-[0.8rem]"
        title="Ask for a source-grounded replacement, or an honest decline"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4 text-forest" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M11.5 2.5l2 2L6 12l-3 1 1-3z" strokeLinejoin="round" />
        </svg>
        One-Click Truth Repair
      </button>
    )
  }

  return (
    <div className="mt-3.5 rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <span className="caps text-[0.64rem]">Truth Repair</span>
        <button type="button" onClick={() => setIsOpen(false)} className="btn btn-quiet !text-[0.76rem]">
          Hide
        </button>
      </div>
      {body}
    </div>
  )
}

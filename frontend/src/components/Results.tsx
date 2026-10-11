import { useMemo, useRef, useState } from 'react'
import type { AnalyseResult, Claim } from '../types'
import AnswerHighlights from './AnswerHighlights'
import ClaimInspector from './ClaimInspector'
import CourtroomView from './CourtroomView'
import VerdictBar from './VerdictBar'

interface Props {
  result: AnalyseResult
  answer: string
  sourceText?: string
  file?: File | null
  onReset?: () => void
}

/**
 * Results view.
 *
 * Layout per the redesign spec: a sticky Verdict Bar (segmented proportions +
 * counts, doubling as the filter), then two panes — the Annotated Answer on the
 * left as the reading surface, and a sticky Claim Inspector on the right for
 * the selected claim. The claim list is a slim numbered rail inside the
 * annotated answer, not a second wall of cards.
 */
export default function Results({ result, answer, sourceText, file, onReset }: Props) {
  const { claims, summary, source_info } = result
  const [filter, setFilter] = useState<string>('all')
  const [copied, setCopied] = useState(false)
  const [courtroomClaim, setCourtroomClaim] = useState<Claim | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(claims[0]?.id ?? null)

  const filterRef = useRef(filter)
  filterRef.current = filter

  const filteredClaims = useMemo(() => {
    if (filter === 'all') return claims
    if (filter === 'needs_review') return claims.filter((c) => Boolean(c.needs_review))
    return claims.filter((c) => c.verdict === filter)
  }, [claims, filter])

  /** Original position of every claim, so numbering stays stable under filters. */
  const claimIndex = useMemo(() => new Map(claims.map((c, i) => [c.id, i])), [claims])

  const selectedClaim = useMemo(
    () => claims.find((c) => c.id === selectedId) ?? filteredClaims[0] ?? claims[0] ?? null,
    [claims, filteredClaims, selectedId],
  )

  const activeFilterLabel =
    filter === 'all'
      ? 'All claims'
      : filter === 'needs_review'
      ? 'Needs review'
      : filter

  /**
   * Select a claim. If the active filter hides it, clear the filter first so
   * the selection always lands somewhere visible.
   */
  const selectClaim = (id: string) => {
    const reveal = () => {
      setSelectedId(id)
      const el = document.getElementById(`claim-${id}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    if (filteredClaims.some((c) => c.id === id)) reveal()
    else {
      setFilter('all')
      window.setTimeout(reveal, 60)
    }
  }

  const handleCopyReport = async () => {
    const lines = [
      `VeriFact — Analysis Results`,
      `Source: ${source_info.file_name ?? 'Pasted text'} (${source_info.pages} ${source_info.pages === 1 ? 'page' : 'pages'})`,
      `Model: ${result.model}`,
      ``,
      `Summary:`,
      `- Total claims: ${summary.total}`,
      `- Supported: ${summary.supported}`,
      `- Contradicted: ${summary.contradicted}`,
      `- Not stated in source: ${summary.not_stated}`,
      `- Ambiguous / conflicting: ${summary.ambiguous}`,
      `- Needs human review: ${summary.needs_review}`,
      ``,
      `Claims:`,
      ...claims.map(
        (c, i) =>
          `${i + 1}. [${c.verdict}] "${c.claim_text}" (Status: ${c.evidence_status})`
      ),
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard write unavailable
    }
  }

  return (
    <div className="scene-enter">
      {/* Results heading — the count-driven arrival moment */}
      <div className="mx-auto max-w-[1240px] px-5 pb-5 pt-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="caps mb-2 font-semibold text-crimson">Audit complete</p>
            <h1 className="text-[clamp(1.6rem,3.4vw,2.3rem)] leading-[1.15] text-charcoal">
              {summary.total === 0 ? (
                'No checkable claims found in this answer'
              ) : (
                <>
                  {summary.total} claim{summary.total === 1 ? '' : 's'} audited
                  <span className="text-ink-faint"> — </span>
                  <span className={summary.supported > 0 ? 'text-forest' : 'text-ink-soft'}>
                    {summary.supported} backed by your source
                  </span>
                </>
              )}
            </h1>
            <p className="mt-2 max-w-[52ch] text-[0.9rem] leading-relaxed text-ink-soft">
              {summary.total === 0
                ? 'The extraction pass found no individual statements to audit. The answer may be purely conversational, or too short to check.'
                : `${summary.contradicted} contradicted · ${summary.not_stated} not stated · ${summary.ambiguous} ambiguous — ${summary.needs_review} flagged for human review.`}
            </p>
            <p className="mt-1.5 text-[0.78rem] text-ink-faint">
              {source_info.file_name ?? 'Pasted text'} · {source_info.pages}{' '}
              {source_info.pages === 1 ? 'page' : 'pages'} · {result.model}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="btn btn-outline !py-1.5 !px-3 text-[0.8rem]"
              title="Copy summary report to clipboard"
            >
              {copied ? '✓ Copied report' : 'Copy report'}
            </button>
            {onReset && (
              <button type="button" onClick={onReset} className="btn btn-primary !py-1.5 !px-3 text-[0.8rem]">
                New analysis
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verdict Bar — sticky, replaces the duplicated tiles + pills */}
      {summary.total > 0 && (
        <VerdictBar
          summary={summary}
          selectedFilter={filter}
          onSelectFilter={setFilter}
          model={result.model}
        />
      )}

      {/* A 64px gap and a divider separate the bar from the reading area */}
      <section className="mx-auto max-w-[1240px] px-5 pt-10 sm:px-8">
        {claims.length === 0 ? (
          <div className="panel px-6 py-8 text-center">
            <p className="caps mb-2">No claims found</p>
            <p className="text-[0.95rem] text-ink-soft">
              The extraction pass found no checkable claims in this answer. It may be purely
              conversational, or too short to audit.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)] lg:items-start">
            {/* Left 55% — the Annotated Answer, the reading surface */}
            <div>
              <AnswerHighlights
                answer={answer}
                claims={claims}
                selectedId={selectedClaim?.id ?? null}
                onSelectClaim={selectClaim}
              />

              {/* Slim claim rail — numbered markers, not a wall of cards */}
              <div className="panel mt-5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="caps text-[0.66rem]">Claims</span>
                  <span className="text-[0.74rem] text-ink-faint">
                    {filter === 'all'
                      ? `All ${claims.length}`
                      : `Showing ${filteredClaims.length} of ${claims.length} · ${activeFilterLabel}`}
                  </span>
                </div>

                {filteredClaims.length === 0 ? (
                  <div className="mt-3 text-center">
                    <p className="text-[0.88rem] text-ink-soft">
                      None of the {claims.length} claims carry the “{activeFilterLabel}” verdict.
                    </p>
                    <button type="button" onClick={() => setFilter('all')} className="btn btn-outline mt-3 !py-1 !px-3 text-[0.78rem]">
                      Show all claims
                    </button>
                  </div>
                ) : (
                  <ol className="mt-3 space-y-1">
                    {filteredClaims.map((claim, i) => {
                      const idx = claimIndex.get(claim.id) ?? i
                      const active = selectedClaim?.id === claim.id
                      return (
                        <li key={claim.id}>
                          <button
                            type="button"
                            onClick={() => selectClaim(claim.id)}
                            aria-current={active ? 'true' : undefined}
                            className={`flex w-full items-start gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left transition-colors ${
                              active ? 'bg-ivory-deep' : 'hover:bg-ivory-deep/60'
                            }`}
                          >
                            <span className="mt-0.5 font-mono text-[0.72rem] font-bold text-ink-faint">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span
                              className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                claim.verdict === 'Supported'
                                  ? 'bg-forest'
                                  : claim.verdict === 'Contradicted'
                                  ? 'bg-brick'
                                  : claim.verdict === 'Not stated in source'
                                  ? 'bg-slate'
                                  : 'bg-amber'
                              }`}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 text-[0.86rem] leading-snug text-charcoal">
                              {claim.claim_text}
                            </span>
                            {claim.needs_review && (
                              <span className="mt-0.5 shrink-0 rounded-full border border-amber px-1.5 text-[0.6rem] font-bold text-amber" title="Flagged for human review">
                                review
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                )}

                <p className="mt-3 border-t border-line pt-2.5 text-[0.72rem] leading-relaxed text-ink-faint">
                  {result.evidence_note}
                </p>
              </div>
            </div>

            {/* Right 45% — the sticky Claim Inspector */}
            <div className="lg:sticky lg:top-[124px]">
              {selectedClaim ? (
                <ClaimInspector
                  claim={selectedClaim}
                  index={claimIndex.get(selectedClaim.id) ?? 0}
                  answer={answer}
                  sourceText={sourceText}
                  file={file ?? null}
                  onOpenCourtroom={setCourtroomClaim}
                />
              ) : (
                <div className="panel px-5 py-6 text-center">
                  <p className="text-[0.9rem] text-ink-soft">
                    Select a claim from the list to inspect its evidence.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 border-t border-line pt-5">
          <p className="max-w-[54ch] text-[0.8rem] leading-relaxed text-ink-faint">
            Read every verdict with its evidence status. “Verified” means the quotation exists in
            your document — it does not mean the claim is true, only that the source backs it.
          </p>
        </div>
      </section>

      {/* Dedicated AI Courtroom Hearing View */}
      {courtroomClaim && (
        <CourtroomView
          claim={courtroomClaim}
          answer={answer}
          sourceText={sourceText ?? ''}
          file={file ?? null}
          onClose={() => setCourtroomClaim(null)}
        />
      )}
    </div>
  )
}

import type { AnalyseResult } from '../types'
import AnswerHighlights from './AnswerHighlights'
import ClaimCard from './ClaimCard'
import SummaryBar from './SummaryBar'

interface Props {
  result: AnalyseResult
  answer: string
}

export default function Results({ result, answer }: Props) {
  const { claims, summary, source_info } = result

  return (
    <div className="mt-10">
      <SummaryBar
        summary={summary}
        origin={source_info.origin}
        fileName={source_info.file_name}
        pages={source_info.pages}
        model={result.model}
      />

      <section className="mx-auto max-w-[1200px] px-5 pt-8 sm:px-8">
        {claims.length === 0 ? (
          <div className="panel px-6 py-8 text-center">
            <p className="caps mb-2">No claims found</p>
            <p className="text-[0.95rem] text-ink-soft">
              The extraction pass found no checkable claims in this answer. It may be purely
              conversational, or too short to audit.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <div className="lg:sticky lg:top-6">
              <AnswerHighlights answer={answer} claims={claims} />
              <p className="mt-3 text-[0.76rem] leading-relaxed text-ink-faint">
                {result.evidence_note}
              </p>
            </div>

            <div>
              <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-2">
                <h2 className="text-[1.15rem] font-semibold text-charcoal">Claim review</h2>
                <span className="text-[0.76rem] text-ink-faint">
                  {summary.needs_review > 0
                    ? `${summary.needs_review} of ${summary.total} flagged for human review`
                    : `${summary.total} of ${summary.total} checked`}
                </span>
              </div>

              <div className="space-y-4">
                {claims.map((claim, i) => (
                  <ClaimCard key={claim.id} claim={claim} index={i} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <p className="max-w-[46rem] text-[0.8rem] leading-relaxed text-ink-faint">
            Read every verdict with its evidence status. “Verified” means the quotation exists in
            your document — it does not mean the claim is true, only that the source backs it.
          </p>
        </div>
      </section>
    </div>
  )
}

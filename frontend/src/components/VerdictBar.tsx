import type { Summary, Verdict } from '../types'
import { VERDICT_META } from './VerdictChip'

interface Props {
  summary: Summary
  selectedFilter: string
  onSelectFilter: (filter: string) => void
  /** Model name, shown once in the bar's meta line. */
  model: string
}

type Segment = { key: string; verdict: Verdict; label: string; count: number; color: string }

/**
 * The Verdict Bar: a single sticky row that replaces both the six stat tiles
 * and the six filter pills they duplicated.
 *
 * The segmented strip shows verdict proportions AND is the filter — each
 * segment is a button. "Needs review" is a separate small toggle because it
 * crosses verdicts.
 */
export default function VerdictBar({ summary, selectedFilter, onSelectFilter, model }: Props) {
  const segments: Segment[] = (
    [
      { key: 'Supported', verdict: 'Supported', label: 'Supported', count: summary.supported, color: 'var(--color-forest)' },
      { key: 'Contradicted', verdict: 'Contradicted', label: 'Contradicted', count: summary.contradicted, color: 'var(--color-brick)' },
      { key: 'Not stated in source', verdict: 'Not stated in source', label: 'Not stated', count: summary.not_stated, color: 'var(--color-slate)' },
      { key: 'Ambiguous/conflicting', verdict: 'Ambiguous/conflicting', label: 'Ambiguous', count: summary.ambiguous, color: 'var(--color-amber)' },
    ] as Segment[]
  ).filter((s) => s.count > 0)

  const total = summary.total || 1
  const allActive = selectedFilter === 'all'

  return (
    <div className="glass sticky top-[57px] z-20 border-y border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3 sm:px-8">
        {/* Counts + segmented proportion strip */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="shrink-0">
            <span className="text-[1.35rem] font-bold leading-none text-charcoal">{summary.total}</span>
            <span className="ml-1.5 text-[0.78rem] text-ink-soft">
              claim{summary.total === 1 ? '' : 's'}
            </span>
          </div>

          {/* The strip: proportions by default, filter when a verdict is chosen */}
          <div
            className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line"
            role="group"
            aria-label="Verdict proportions — select a segment to filter"
          >
            {segments.map((seg) => {
              const active = selectedFilter === seg.key
              return (
                <button
                  key={seg.key}
                  type="button"
                  onClick={() => onSelectFilter(allActive || active ? (active ? 'all' : seg.key) : seg.key)}
                  aria-pressed={active}
                  aria-label={`${seg.label}: ${seg.count} of ${summary.total} — filter by this verdict`}
                  title={`${seg.label}: ${seg.count}`}
                  className="h-full transition-opacity"
                  style={{
                    width: `${(seg.count / total) * 100}%`,
                    background: seg.color,
                    opacity: allActive || active ? 1 : 0.34,
                    outline: active ? '2px solid var(--color-charcoal)' : 'none',
                    outlineOffset: '-2px',
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Legend / filter buttons */}
        <div className="flex flex-wrap items-center gap-1">
          {segments.map((seg) => {
            const meta = VERDICT_META[seg.verdict]
            const active = selectedFilter === seg.key
            return (
              <button
                key={seg.key}
                type="button"
                onClick={() => onSelectFilter(active ? 'all' : seg.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.76rem] font-medium transition-colors ${
                  active
                    ? 'bg-charcoal text-white dark:bg-crimson'
                    : 'text-ink-soft hover:bg-ivory-deep hover:text-charcoal'
                }`}
              >
                <span className={active ? 'text-white' : meta.cls.replace('v-', 'text-')} aria-hidden="true" style={!active ? { color: seg.color } : undefined}>
                  {meta.icon}
                </span>
                <span>{seg.label}</span>
                <span className="font-bold">{seg.count}</span>
              </button>
            )
          })}

          {summary.needs_review > 0 && (
            <button
              type="button"
              onClick={() => onSelectFilter(selectedFilter === 'needs_review' ? 'all' : 'needs_review')}
              aria-pressed={selectedFilter === 'needs_review'}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.76rem] font-medium transition-colors ${
                selectedFilter === 'needs_review'
                  ? 'border-amber bg-amber text-white'
                  : 'border-amber/50 text-amber hover:bg-amber-surface'
              }`}
              title="Claims the evidence safeguard flagged for a human"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M8 2.5l5.5 10h-11z" strokeLinejoin="round" />
                <path d="M8 6.5v3" strokeLinecap="round" />
                <circle cx="8" cy="11.4" r="0.7" fill="currentColor" stroke="none" />
              </svg>
              <span>Needs review</span>
              <span className="font-bold">{summary.needs_review}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            disabled={allActive}
            className={`rounded-full px-2.5 py-1 text-[0.76rem] font-medium transition-colors ${
              allActive ? 'text-ink-faint' : 'text-ink-soft hover:text-charcoal'
            }`}
          >
            Show all
          </button>
        </div>
      </div>

      <p className="mx-auto max-w-[1240px] px-5 pb-2 text-[0.72rem] text-ink-faint sm:px-8">
        Verdicts proposed by {model}; quotations verified by this app. A verified quote means the
        text exists in your source — it does not prove the claim.
      </p>
    </div>
  )
}

import type { Summary } from '../types'

interface Props {
  summary: Summary
  origin: 'pdf' | 'text'
  fileName: string | null
  pages: number
  model: string
  selectedFilter?: string
  onSelectFilter?: (filter: string) => void
}

function swatch(verdict: string) {
  switch (verdict) {
    case 'total':
      return 'bg-charcoal'
    case 'supported':
      return 'bg-forest'
    case 'contradicted':
      return 'bg-brick'
    case 'not_stated':
      return 'bg-ink-faint'
    default:
      return 'bg-amber'
  }
}

const FILTER_MAP: Record<string, string> = {
  total: 'all',
  supported: 'Supported',
  contradicted: 'Contradicted',
  not_stated: 'Not stated in source',
  ambiguous: 'Ambiguous/conflicting',
  needs_review: 'needs_review',
}

export default function SummaryBar({
  summary,
  origin,
  fileName,
  pages,
  model,
  selectedFilter = 'all',
  onSelectFilter,
}: Props) {
  const items: Array<{ key: string; label: string; value: number }> = [
    { key: 'total', label: 'Total claims', value: summary.total },
    { key: 'supported', label: 'Supported', value: summary.supported },
    { key: 'contradicted', label: 'Contradicted', value: summary.contradicted },
    { key: 'not_stated', label: 'Not stated in source', value: summary.not_stated },
    { key: 'ambiguous', label: 'Ambiguous / conflicting', value: summary.ambiguous },
    { key: 'needs_review', label: 'Needs human review', value: summary.needs_review },
  ]

  return (
    <section
      className="border-y border-line bg-ivory-deep"
      aria-label="Analysis summary"
    >
      <div className="mx-auto max-w-[1240px] px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="caps">
            Analysis summary
            {onSelectFilter && (
              <span className="ml-2 font-normal normal-case tracking-normal text-ink-faint">
                — select a card to filter the claim list
              </span>
            )}
          </p>
          <p className="text-[0.76rem] text-ink-soft">
            Source: {fileName ?? 'pasted text'} · {pages} {pages === 1 ? 'page' : 'pages'} ·
            verdicts proposed by {model}, evidence validated by this app
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
          {items.map((item) => {
            const review = item.key === 'needs_review'
            const filterTarget = FILTER_MAP[item.key]
            const isSelected = selectedFilter === filterTarget
            const isClickable = Boolean(onSelectFilter)
            const share =
              summary.total > 0
                ? Math.min(100, Math.max((item.value / summary.total) * 100, item.value > 0 ? 4 : 0))
                : 0

            return (
              <button
                type="button"
                key={item.key}
                disabled={!isClickable}
                onClick={() => onSelectFilter?.(isSelected && item.key !== 'total' ? 'all' : filterTarget)}
                aria-pressed={isSelected}
                aria-label={isClickable ? `Filter by ${item.label}: ${item.value}` : undefined}
                className={`text-left transition-all ${
                  isClickable ? 'cursor-pointer' : ''
                } rounded-md border p-3 ${
                  isSelected
                    ? 'border-crimson bg-paper shadow-xs ring-1 ring-crimson/30'
                    : 'border-line/70 bg-paper/70 hover:border-line-strong hover:bg-paper'
                } dark:rounded-none dark:p-0 dark:border-0 dark:border-t dark:pt-2.5 dark:bg-transparent dark:ring-0 ${
                  review ? 'border-amber/50 dark:border-amber/50' : 'dark:border-line'
                }`}
                title={isClickable ? `Filter by ${item.label}` : undefined}
              >
                <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${swatch(item.key)}`} aria-hidden="true" />
                  <span className={review ? 'text-amber' : ''}>{item.label}</span>
                </div>
                <div
                  className={`mt-1.5 text-[1.65rem] font-bold leading-none dark:font-display dark:tracking-[0.02em] ${
                    item.key === 'supported'
                      ? 'text-forest dark:text-emerald-400'
                      : item.key === 'contradicted'
                      ? 'text-brick dark:text-rose-400'
                      : item.key === 'ambiguous'
                      ? 'text-amber dark:text-amber-400'
                      : review
                      ? 'text-amber dark:text-amber-400'
                      : 'text-charcoal'
                  }`}
                >
                  {item.value}
                </div>
                {/* Share of audited claims — Light Mode only */}
                <div
                  className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-line dark:hidden"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full rounded-full ${swatch(item.key)}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-[0.76rem] text-ink-faint">
          {origin === 'pdf'
            ? 'Page numbers below were recomputed by matching each verified quotation against the extracted PDF text.'
            : 'Page numbers below were recomputed by matching each verified quotation against the pasted source text.'}
        </p>
      </div>
    </section>
  )
}

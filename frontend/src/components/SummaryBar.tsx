import type { Summary } from '../types'

interface Props {
  summary: Summary
  origin: 'pdf' | 'text'
  fileName: string | null
  pages: number
  model: string
}

function swatch(verdict: string) {
  switch (verdict) {
    case 'total':
      return 'bg-transparent'
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

export default function SummaryBar({ summary, origin, fileName, pages, model }: Props) {
  const items: Array<{ key: string; label: string; value: number }> = [
    { key: 'total', label: 'Total claims', value: summary.total },
    { key: 'supported', label: 'Supported', value: summary.supported },
    { key: 'contradicted', label: 'Contradicted', value: summary.contradicted },
    { key: 'not_stated', label: 'Not stated in source', value: summary.not_stated },
    { key: 'ambiguous', label: 'Ambiguous / conflicting', value: summary.ambiguous },
    { key: 'needs_review', label: 'Needs human review', value: summary.needs_review },
  ]

  return (
    <section className="border-y border-line bg-sage-soft" aria-label="Analysis summary">
      <div className="mx-auto max-w-[1200px] px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="caps">Analysis summary</p>
          <p className="text-[0.76rem] text-ink-soft">
            Source: {fileName ?? 'pasted text'} · {pages} {pages === 1 ? 'page' : 'pages'} ·
            verdicts proposed by {model}, evidence validated by this app
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item) => {
            const review = item.key === 'needs_review'
            return (
              <div
                key={item.key}
                className={`border-t pt-2.5 ${review ? 'border-amber/50' : 'border-line-strong'}`}
              >
                <dt className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-ink-soft">
                  <span className={`h-2 w-2 shrink-0 ${swatch(item.key)}`} aria-hidden="true" />
                  <span className={review ? 'text-amber' : ''}>{item.label}</span>
                </dt>
                <dd
                  className={`mt-1 font-display text-[1.7rem] leading-none ${
                    review ? 'text-amber' : 'text-charcoal'
                  }`}
                >
                  {item.value}
                </dd>
              </div>
            )
          })}
        </dl>

        <p className="mt-4 text-[0.76rem] text-ink-faint">
          {origin === 'pdf'
            ? 'Page numbers below were recomputed by matching each verified quotation against the extracted PDF text.'
            : 'Page numbers below were recomputed by matching each verified quotation against the pasted source text.'}
        </p>
      </div>
    </section>
  )
}

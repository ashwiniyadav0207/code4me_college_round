import type { Verdict } from '../types'

/**
 * Verdict chip: an icon + the word, so meaning never depends on colour alone.
 * Used in the Verdict Bar, the Claim Inspector and the Courtroom so the
 * vocabulary stays identical everywhere.
 */
export const VERDICT_META: Record<Verdict, { cls: string; icon: React.ReactNode; short: string }> = {
  Supported: {
    cls: 'v-supported',
    short: 'Supported',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 8.5l3.5 3.5 6.5-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  Contradicted: {
    cls: 'v-contradicted',
    short: 'Contradicted',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
      </svg>
    ),
  },
  'Not stated in source': {
    cls: 'v-not-stated',
    short: 'Not stated',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M8 4v5" strokeLinecap="round" />
        <circle cx="8" cy="11.6" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  'Ambiguous/conflicting': {
    cls: 'v-ambiguous',
    short: 'Ambiguous',
    icon: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M6.2 5.4a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.7-.8 1.2v.3" strokeLinecap="round" />
        <circle cx="8" cy="11.7" r="0.85" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
}

/** The verdict may arrive with a slightly different model spelling; normalise it. */
export function normaliseVerdict(verdict: string): Verdict {
  const v = verdict.trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (v === 'supported') return 'Supported'
  if (v === 'contradicted' || v === 'false') return 'Contradicted'
  if (v === 'not stated' || v === 'not stated in source' || v === 'not found in source') return 'Not stated in source'
  return 'Ambiguous/conflicting'
}

interface Props {
  verdict: Verdict
  /** "Needs review" is a flag on the chip, not a separate banner. */
  needsReview?: boolean
  size?: 'sm' | 'md'
}

export default function VerdictChip({ verdict, needsReview = false, size = 'md' }: Props) {
  const meta = VERDICT_META[verdict]
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${meta.cls} ${
        size === 'sm' ? 'px-2 py-0.5 text-[0.72rem]' : 'px-2.5 py-1 text-[0.8rem]'
      }`}
      role="status"
    >
      {meta.icon}
      <span>{meta.short}</span>
      {needsReview && (
        <span
          className="ml-0.5 rounded-full border border-current px-1 text-[0.62rem] font-bold leading-[1.5]"
          title="Flagged for human review"
        >
          review
        </span>
      )}
    </span>
  )
}

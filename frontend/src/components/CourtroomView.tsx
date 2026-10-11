import { useEffect, useRef, useState } from 'react'
import { courtroomClaim } from '../api'
import type { Claim, CourtroomResult, Evidence } from '../types'

interface Props {
  claim: Claim
  answer?: string
  sourceText: string
  file: File | null
  onClose: () => void
}

const JUDGE_COLOURS: Record<string, string> = {
  Supported: 'text-cyan',
  Contradicted: 'text-crimson',
  'Not stated in source': 'text-slate',
  'Ambiguous/conflicting': 'text-amber',
  'Insufficient evidence': 'text-amber',
}

function Exhibit({ ev, side }: { ev: Evidence; side: string }) {
  return (
    <figure
      data-verified={ev.verified}
      className={`relative bg-paper px-4 py-3 ${
        ev.verified
          ? 'border-2 border-line'
          : 'border-2 border-dashed border-brick/70 opacity-70'
      }`}
      style={ev.verified ? { boxShadow: '4px 4px 0 0 rgba(39,225,255,0.5)' } : undefined}
    >
      <figcaption className="mb-1.5 flex items-center justify-between gap-2">
        <span className="caps text-[0.62rem] font-bold">
          Exhibit · verbatim, {ev.verified ? 'verified' : 'not found'}
        </span>
        <span className="font-mono text-[0.66rem] font-bold text-ink-soft">
          {ev.page !== null ? `p.${ev.page}` : 'no page'}
        </span>
      </figcaption>
      <blockquote className="quote text-[1rem] leading-[1.5] text-charcoal">“{ev.quote}”</blockquote>
      {!ev.verified && (
        <p className="mt-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-brick">
          Not found in source — not usable as evidence
        </p>
      )}
      <span className="mt-1.5 block text-[0.64rem] text-ink-faint">Cited by {side}</span>
    </figure>
  )
}

function Stage({
  title, sub, side, argument, evidence, supports, accent,
}: {
  title: string; sub: string; side: string; argument: string; evidence: Evidence[]
  supports?: boolean; accent: string
}) {
  return (
    <section
      className="relative bg-paper p-5"
      style={{ border: `2px solid ${accent}`, boxShadow: `6px 6px 0 0 ${accent}55` }}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-line pb-3">
        <h3 className="font-display text-[1.6rem] leading-none uppercase tracking-wide" style={{ color: accent }}>
          {title}
        </h3>
        <span className="caps text-[0.62rem] font-bold text-ink-faint">{sub}</span>
      </header>

      <p className="caps mb-1.5 text-[0.62rem] font-bold text-ink-faint">Reasoning (model-generated)</p>
      <p className="text-[0.98rem] leading-relaxed text-charcoal">{argument}</p>

      {supports !== undefined && (
        <p className="mt-3 inline-block border-2 border-line bg-ivory-deep px-3 py-1 text-[0.78rem] font-semibold text-charcoal">
          Source supports the claim: <span style={{ color: supports ? 'var(--color-forest)' : 'var(--color-brick)' }}>{supports ? 'Yes' : 'No'}</span>
        </p>
      )}

      <div className="mt-4">
        <p className="caps mb-2 text-[0.62rem] font-bold text-ink-faint">
          Exhibits ({evidence.length})
        </p>
        {evidence.length > 0 ? (
          <div className="space-y-3">{evidence.map((ev, i) => <Exhibit key={i} ev={ev} side={side} />)}</div>
        ) : (
          <p className="border-2 border-dashed border-line px-3 py-3 text-[0.82rem] text-ink-soft">
            The {side.toLowerCase()} cites no exhibit from your source.
          </p>
        )}
      </div>
    </section>
  )
}

/**
 * AI Courtroom — full-screen comic-panel hearing.
 *
 * Honesty rules preserved from the API contract: the three roles come from a
 * single model call (disclosed permanently at the top), a verified quote means
 * the text exists rather than that it proves the claim, and an unvalidated
 * ruling is shown muted and labelled as model opinion.
 */
export default function CourtroomView({ claim, answer, sourceText, file, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<CourtroomResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'prosecution' | 'defense' | 'ruling'>('prosecution')

  // `onClose` is an inline arrow in Results, so it gets a fresh identity every
  // render. Keeping it in a ref stops the effect below from tearing down and
  // re-firing the API on every render — the hearing would otherwise flicker
  // and spam /api/courtroom.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  const claimKey = `${claim.claim_text}::${claim.verdict}::${sourceText.length}::${file ? file.name : 'text'}`

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true); setError(null)
      try {
        const data = await courtroomClaim({
          claimText: claim.claim_text, answer, claimVerdict: claim.verdict, sourceText, file,
        })
        if (mounted) setResult(data)
      } catch (err: any) {
        if (mounted) setError(err?.message || 'The hearing failed to convene.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      mounted = false
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimKey])

  const judge = result?.judge
  const unvalidated = judge?.verdict === 'Insufficient evidence' || judge?.needs_review === true
  const mismatch = judge && claim.verdict && judge.verdict !== claim.verdict

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ivory text-charcoal dark spider-halftone-bg" role="dialog" aria-modal="true" aria-label="AI Courtroom hearing">
      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6">
        {/* Top bar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="caps text-[0.66rem] font-bold text-crimson dark:text-cyan">Court of Evidence</p>
          <button type="button" onClick={onClose} className="btn btn-outline !border-crimson !text-crimson text-[0.8rem]">
            Back to investigation (Esc)
          </button>
        </div>

        {/* The charge */}
        <header className="mb-4 bg-paper p-5" style={{ border: '2px solid var(--color-crimson)', boxShadow: '6px 6px 0 0 rgba(39,225,255,0.55)' }}>
          <p className="caps mb-2 text-[0.62rem] font-bold text-ink-faint">The claim on trial</p>
          <h2 className="font-display text-[clamp(1.5rem,3.4vw,2.4rem)] leading-[1.1] uppercase text-charcoal">
            “{claim.claim_text}”
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="caps text-[0.62rem] font-bold text-ink-faint">Investigation verdict</span>
            <span className="docket-stamp px-2.5 py-1 text-[0.72rem] font-bold v-not-stated" style={{ color: 'var(--color-charcoal)' }}>
              {claim.verdict}
            </span>
          </div>
        </header>

        {/* Permanent disclosure — always visible */}
        <p className="mb-5 border-l-4 border-cyan bg-paper px-4 py-3 text-[0.82rem] leading-relaxed text-ink-soft">
          <strong className="font-bold text-charcoal">Disclosure.</strong> Prosecutor, Defender and
          Judge are three roles generated by <strong className="font-bold text-charcoal">one model call</strong> —
          they argue, they are not independent agents. Quoted exhibits are verified by this app
          against your source. A verified quote shows the text exists; it does not prove the claim.
        </p>

        {loading && (
          <div className="bg-paper px-5 py-16 text-center" style={{ border: '2px solid var(--color-line)' }} aria-live="polite">
            <div className="spinner-dark mx-auto mb-4 h-8 w-8" />
            <h3 className="font-display text-[1.7rem] uppercase text-charcoal">The bench is convening</h3>
            <p className="mt-2 text-[0.85rem] text-ink-soft">Appointing counsel and indexing your source.</p>
          </div>
        )}

        {error && (
          <div className="border-2 border-brick bg-brick-surface p-5">
            <h3 className="font-display text-[1.4rem] uppercase text-brick">Halted</h3>
            <p className="mt-1.5 text-[0.9rem] text-charcoal">{error}</p>
            <button type="button" onClick={onClose} className="btn btn-outline mt-3 text-[0.8rem]">Return to audit</button>
          </div>
        )}

        {result && !loading && (
          <>
            {/* Mobile tabs */}
            <div className="mb-4 flex gap-1 border-2 border-line bg-paper p-1 lg:hidden" role="group" aria-label="Hearing sections">
              {(['prosecution', 'defense', 'ruling'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t}
                  className={`flex-1 px-3 py-2 text-[0.8rem] font-bold uppercase tracking-wide ${
                    tab === t ? 'bg-charcoal text-white' : 'text-ink-soft'
                  }`}>
                  {t === 'prosecution' ? 'Prosecution' : t === 'defense' ? 'Defense' : 'Ruling'}
                </button>
              ))}
            </div>

            {/* The bench — ruling revealed last, at the top centre */}
            <section className="mb-6 bg-paper p-5" style={{ border: '3px solid var(--color-crimson)', boxShadow: '8px 8px 0 0 rgba(39,225,255,0.5)' }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-line pb-3">
                <p className="caps text-[0.64rem] font-bold text-ink-faint">The bench</p>
                {judge && (
                  <span className={`docket-stamp px-3 py-1 text-[0.85rem] font-bold ${unvalidated ? 'text-amber' : ''}`}
                    style={!unvalidated ? { color: JUDGE_COLOURS[judge.verdict] ?? 'var(--color-charcoal)' } : undefined}>
                    {judge.verdict}
                  </span>
                )}
              </div>

              <p className="caps mb-1.5 text-[0.62rem] font-bold text-ink-faint">Reasoning (model-generated)</p>
              <p className={`text-[1rem] leading-relaxed ${unvalidated ? 'opacity-60' : ''}`}>{judge?.reasoning}</p>

              {/* Ruling status — must never silently disagree with the audit */}
              <div className={`mt-4 border-2 px-4 py-3 ${unvalidated ? 'border-amber bg-amber-surface' : 'border-forest bg-sage-soft'}`}>
                <p className={`text-[0.85rem] font-bold ${unvalidated ? 'text-amber' : 'text-forest'}`}>
                  {unvalidated
                    ? 'Ruling status: Unvalidated — no conclusion recorded'
                    : 'Ruling status: Verified against source'}
                </p>
                {unvalidated && (
                  <p className="mt-1 text-[0.78rem] text-ink-soft">Model opinion, not recorded.</p>
                )}
                {judge?.review_reason && <p className="mt-1 text-[0.78rem] text-ink-soft">{judge.review_reason}</p>}
              </div>

              {mismatch && (
                <p className="mt-3 border-2 border-amber px-3 py-2 text-[0.78rem] font-semibold text-amber">
                  Discrepancy: the investigation recorded “{claim.verdict}” while this hearing's judge
                  concluded “{judge.verdict}”. Both are shown; neither is hidden.
                </p>
              )}
            </section>

            {/* Councils face each other across the aisle */}
            <div className={`grid gap-5 lg:grid-cols-2 ${tab === 'prosecution' ? '' : 'hidden lg:grid'} ${tab === 'prosecution' ? '' : ''}`}
              style={tab === 'prosecution' ? {} : {}}>
              <div className={tab === 'prosecution' ? '' : 'hidden lg:block'}>
                <Stage title="Prosecution" sub="Against the claim" side="Prosecution"
                  argument={result.prosecutor.argument} evidence={result.prosecutor.evidence} accent="var(--color-brick)" />
              </div>
              <div className={tab === 'defense' ? '' : 'hidden lg:block'}>
                <Stage title="Defense" sub="For the claim" side="Defense"
                  argument={result.defender.argument} evidence={result.defender.evidence}
                  supports={result.defender.source_supports_claim} accent="var(--color-forest)" />
              </div>
            </div>

            {/* Mobile: ruling duplicated into its own tab */}
            <div className={`${tab === 'ruling' ? 'block' : 'hidden'} lg:hidden`}>
              <div className="bg-paper p-4" style={{ border: '2px solid var(--color-crimson)' }}>
                <p className="caps mb-1.5 text-[0.62rem] font-bold text-ink-faint">Ruling</p>
                <p className={`text-[0.95rem] ${unvalidated ? 'opacity-60' : ''}`}>{judge?.reasoning}</p>
              </div>
            </div>

            <p className="mt-6 border-t-2 border-line pt-4 text-[0.75rem] leading-relaxed text-ink-faint">
              {result.evidence_note}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

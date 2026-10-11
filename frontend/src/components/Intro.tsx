import { SpiderVerseHeroVignette } from './SpiderWebs'

interface Props {
  theme?: 'light' | 'dark'
}

/**
 * Homepage hero. A single-screen statement of what the tool does, not a form:
 * the actual input surface is the Evidence Desk directly below it.
 */
export default function Intro({ theme }: Props) {
  return (
    <section className="relative mx-auto max-w-[1240px] px-5 pb-2 pt-10 sm:px-8 sm:pt-14">
      {theme === 'dark' && <SpiderVerseHeroVignette />}

      <div className="relative z-10 max-w-[46rem]">
        <p className="caps mb-3 font-semibold text-crimson">Claim-by-claim audit</p>
        <h1 className="hero-heading text-[clamp(2.1rem,5vw,3.4rem)] leading-[1.08] text-charcoal">
          Check an AI answer against the document it should have used.
        </h1>
        <p className="mt-5 max-w-[54ch] text-[1.06rem] leading-relaxed text-ink-soft">
          VeriFact splits the answer into individual claims, tests each one against your source,
          and shows the exact quotation and page behind every verdict.
        </p>

        <p className="caption-box mt-6 max-w-[52ch] text-[0.85rem] leading-relaxed text-ink-soft">
          <strong className="font-semibold text-charcoal">Verdicts are proposed by a model;</strong>{' '}
          quotations are verified by this app.
        </p>
      </div>
    </section>
  )
}

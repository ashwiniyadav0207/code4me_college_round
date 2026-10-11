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
    <section className="hero-stage relative w-full overflow-hidden">
      {/* Spider-Verse Web Accent contained in the upper-right corner of hero — ONLY active in Dark Mode */}
      {theme === 'dark' && <SpiderVerseHeroVignette />}

      <div className="hero-content relative z-10 mx-auto max-w-[1240px] px-5 pb-6 pt-8 sm:px-8 sm:pt-12 dark:pt-[clamp(2.75rem,7vw,5.75rem)] dark:pb-[clamp(2rem,4vw,3.5rem)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="hero-copy">
            <p className="hero-kicker caps mb-3 font-semibold text-crimson dark:tracking-[0.16em]">
              Claim-by-claim audit
            </p>
            <h1 className="hero-heading max-w-[20ch] text-[clamp(2.1rem,4.5vw,3.2rem)] leading-[1.12] text-charcoal dark:max-w-[21ch] dark:text-[clamp(2.35rem,5.1vw,4rem)] dark:leading-[0.99] dark:tracking-[0.005em]">
              Check an AI answer against the document it should have <span className="hero-heading-accent">used.</span>
            </h1>
            <p className="hero-description mt-4 max-w-[54ch] text-[1.04rem] leading-relaxed text-ink-soft dark:max-w-[56ch] dark:text-[1.05rem]">
              VeriFact splits an AI answer into individual claims, tests each one against your
              source document, and shows the exact quotation and page behind every verdict.
            </p>

            <p className="caption-box mt-5 max-w-[52ch] text-[0.84rem] leading-relaxed text-ink-soft">
              <strong className="font-semibold text-charcoal">Verdicts are proposed by a model;</strong>{' '}
              quotations are verified by this application.
            </p>
          </div>

          <ul className="hero-points space-y-2.5 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-soft lg:border-t-0 lg:border-l lg:border-line lg:pt-1 lg:pl-6">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-crimson dark:shadow-[0_0_4px_rgba(200,16,46,0.3)] shrink-0" aria-hidden="true" />
              <span>Two model calls, no hidden passes</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-crimson dark:shadow-[0_0_4px_rgba(200,16,46,0.3)] shrink-0" aria-hidden="true" />
              <span>Quotations validated in Python</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-crimson dark:shadow-[0_0_4px_rgba(200,16,46,0.3)] shrink-0" aria-hidden="true" />
              <span>Page references recomputed from the source</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-crimson dark:shadow-[0_0_4px_rgba(200,16,46,0.3)] shrink-0" aria-hidden="true" />
              <span>Human review flagged where evidence is thin</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

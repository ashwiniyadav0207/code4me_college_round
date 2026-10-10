import { SpiderVerseHeroVignette } from './SpiderWebs'

interface Props {
  theme?: 'light' | 'dark'
}

export default function Intro({ theme }: Props) {
  return (
    <section className="relative mx-auto max-w-[1200px] px-5 pb-6 pt-8 sm:px-8 sm:pt-12">
      {/* Spider-Verse Web Accent contained in the upper-right corner of hero — ONLY active in Dark Mode */}
      {theme === 'dark' && <SpiderVerseHeroVignette />}

      <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <div>
          <p className="caps mb-3 font-semibold text-crimson">Claim-by-claim audit</p>
          <h1 className="hero-heading max-w-[20ch] text-[clamp(1.9rem,3.8vw,2.85rem)] leading-[1.15] text-charcoal">
            Does the answer actually follow from the source?
          </h1>
          <p className="mt-4 max-w-[52ch] text-[1.02rem] leading-relaxed text-ink-soft">
            Second Opinion splits an AI answer into individual claims, tests each one against the
            document you supply, and shows the exact quotation and page behind every verdict.
          </p>
        </div>

        <ul className="space-y-2 border-t border-line pt-4 text-[0.8125rem] leading-relaxed text-ink-soft lg:border-t-0 lg:border-l lg:border-line lg:pt-1 lg:pl-6">
          <li className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-crimson shrink-0" aria-hidden="true" />
            <span>Two model calls, no hidden passes</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-crimson shrink-0" aria-hidden="true" />
            <span>Quotations validated in Python</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-crimson shrink-0" aria-hidden="true" />
            <span>Page references recomputed from the source</span>
          </li>
          <li className="flex items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-forest dark:bg-crimson shrink-0" aria-hidden="true" />
            <span>Human review flagged where evidence is thin</span>
          </li>
        </ul>
      </div>
    </section>
  )
}

export default function Intro() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-4 pt-10 sm:px-8 sm:pt-14">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <div>
          <p className="caps mb-4">Claim-by-claim audit</p>
          <h1 className="max-w-[19ch] text-[clamp(2rem,4.4vw,3.1rem)] leading-[1.06] tracking-[-0.02em]">
            Does the answer actually follow from the source?
          </h1>
          <p className="mt-5 max-w-[52ch] text-[1.02rem] leading-relaxed text-ink-soft">
            Second Opinion splits an AI answer into individual claims, tests each one against the
            document you supply, and shows the exact quotation and page behind every verdict.
          </p>
        </div>

        <ul className="space-y-1.5 border-t border-line pt-4 text-[0.79rem] leading-relaxed text-ink-soft lg:border-t-0 lg:border-l lg:border-line lg:pt-1 lg:pl-6">
          <li>Two model calls, no hidden passes</li>
          <li>Quotations validated in Python</li>
          <li>Page references recomputed from the source</li>
          <li>Human review flagged where evidence is thin</li>
        </ul>
      </div>
    </section>
  )
}

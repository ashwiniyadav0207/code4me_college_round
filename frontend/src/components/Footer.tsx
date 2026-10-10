export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-ivory-deep">
      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-[46rem]">
            <p className="caps mb-2">Disclaimer</p>
            <p className="text-[0.86rem] leading-relaxed text-ink-soft">
              Second Opinion evaluates an AI answer against the source document you supply. It does
              not independently verify whether that source is true, current or authoritative, and a
              string match on a quotation confirms only that the text exists — not that it proves
              the claim. Verdicts are proposals from a language model; every finding should be read
              together with its evidence status, and flagged items require human review.
            </p>
          </div>
          <div className="text-[0.78rem] text-ink-faint">
            <div className="font-display text-[0.95rem] text-charcoal">Second Opinion</div>
            <div className="mt-1">A VeriFact tool · source-grounded, not internet fact-checked</div>
          </div>
        </div>
      </div>
    </footer>
  )
}

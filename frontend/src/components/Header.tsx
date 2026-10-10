export default function Header() {
  return (
    <header className="border-b border-line bg-ivory">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-x-6 gap-y-4 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-charcoal/70 font-display text-[1.05rem] leading-none tracking-tight text-charcoal"
          >
            SO
          </div>
          <div>
            <div className="caps mb-1 text-ink-faint">VeriFact</div>
            <div className="font-display text-[1.45rem] leading-none tracking-[-0.01em]">
              Second <span className="text-forest">Opinion</span>
            </div>
            <div className="mt-1.5 text-[0.78rem] text-ink-soft">
              Evidence-grounded answer auditing
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border border-line bg-sage-soft px-3.5 py-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-forest" aria-hidden="true" />
          <span className="text-[0.75rem] font-medium tracking-[0.04em] text-forest-deep">
            Source-bound · checks run against your document only
          </span>
        </div>
      </div>
    </header>
  )
}

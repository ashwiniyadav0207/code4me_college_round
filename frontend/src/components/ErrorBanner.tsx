interface Props {
  message: string
  onDismiss: () => void
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pt-8 sm:px-8" role="alert">
      <div className="flex items-start justify-between gap-6 rounded-md border border-brick/40 bg-brick-surface px-5 py-4 shadow-xs">
        <div>
          <p className="caps mb-1 font-semibold text-brick">Analysis stopped</p>
          <p className="text-[0.92rem] leading-relaxed text-charcoal">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="btn btn-quiet shrink-0 !text-[0.78rem]"
          aria-label="Dismiss error"
        >
          Dismiss
        </button>
      </div>
    </section>
  )
}

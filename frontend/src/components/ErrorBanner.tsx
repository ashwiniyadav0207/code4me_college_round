interface Props {
  message: string
  onDismiss: () => void
  onRetry?: () => void
}

export default function ErrorBanner({ message, onDismiss, onRetry }: Props) {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pt-8 sm:px-8" role="alert">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-brick/40 bg-brick-surface px-5 py-4 shadow-xs">
        <div>
          <p className="caps mb-1 font-semibold text-brick">Analysis stopped</p>
          <p className="text-[0.92rem] leading-relaxed text-charcoal">{message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-outline !text-[0.78rem] !py-1 !px-3"
            >
              Retry
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="btn btn-quiet !text-[0.78rem]"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  )
}

import { useRef } from 'react'
import { formatBytes } from '../types'

interface Props {
  mode: 'pdf' | 'text'
  onModeChange: (mode: 'pdf' | 'text') => void
  file: File | null
  onFileChange: (file: File | null) => void
  sourceText: string
  onSourceTextChange: (value: string) => void
  fileError: string | null
  onFileError: (message: string | null) => void
  disabled: boolean
  /** Compact summary chip instead of the full editor, so the answer gets space. */
  collapsed?: boolean
  onToggleCollapsed?: (collapsed: boolean) => void
}

const MAX_PDF_BYTES = 8 * 1024 * 1024

function pageCount(text: string): number {
  return text.includes('\f') ? Math.max(1, text.split('\f').filter((p) => p.trim()).length) : 1
}

export default function SourcePanel({
  mode,
  onModeChange,
  file,
  onFileChange,
  sourceText,
  onSourceTextChange,
  fileError,
  onFileError,
  disabled,
  collapsed = false,
  onToggleCollapsed,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (candidate: File | null | undefined) => {
    if (!candidate) return
    if (!candidate.name.toLowerCase().endsWith('.pdf')) {
      onFileChange(null)
      onFileError('Only .pdf files can be uploaded. Paste the text instead.')
      return
    }
    if (candidate.size > MAX_PDF_BYTES) {
      onFileChange(null)
      onFileError('That PDF is larger than the 8 MB upload limit.')
      return
    }
    onFileError(null)
    onFileChange(candidate)
    onToggleCollapsed?.(true)
  }

  const chars = sourceText.trim().length
  const pages = pageCount(sourceText)
  const hasSource = mode === 'pdf' ? file !== null : chars > 0

  // --- Collapsed: a summary chip; the answer owns the desk ----------------
  if (collapsed && hasSource) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-line bg-ivory-deep px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-forest/12 text-forest"
            aria-hidden="true"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 2h5l3 3v9H4z" strokeLinejoin="round" />
              <path d="M9 2v3h3" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="caps mb-0.5 text-[0.66rem]">Source locked in</p>
            <p className="truncate text-[0.88rem] font-medium text-charcoal">
              {mode === 'pdf' && file
                ? file.name
                : `${chars.toLocaleString()} characters pasted`}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-paper px-2 py-0.5 text-[0.7rem] font-medium text-ink-soft">
            {pages} {pages === 1 ? 'page' : 'pages'}
          </span>
        </div>
        {onToggleCollapsed && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onToggleCollapsed(false)}
            className="btn btn-quiet shrink-0 !text-[0.78rem]"
          >
            Edit source
          </button>
        )}
      </div>
    )
  }

  return (
    <section className="panel flex flex-col" aria-labelledby="source-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <p className="caps text-[0.66rem]">Source</p>
          <h2 id="source-heading" className="mt-0.5 text-[1rem] font-semibold leading-tight text-charcoal">
            The reference document
          </h2>
        </div>
        <div className="flex rounded-[var(--radius-control)] border border-line bg-ivory p-0.5" role="group" aria-label="Source input method">
          {(['text', 'pdf'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(m)}
              aria-pressed={mode === m}
              className={`rounded px-2.5 py-1 text-[0.75rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === m ? 'bg-charcoal text-white dark:bg-crimson' : 'text-ink-soft hover:text-charcoal'
              }`}
            >
              {m === 'text' ? 'Paste text' : 'Upload PDF'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {mode === 'pdf' ? (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (!disabled) accept(e.dataTransfer.files?.[0])
              }}
              className={`flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-[var(--radius-control)] border border-dashed px-5 py-7 text-center transition-colors ${
                file ? 'border-forest bg-sage-soft' : 'border-line-strong bg-ivory'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                disabled={disabled}
                onChange={(e) => {
                  accept(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              {file ? (
                <>
                  <p className="caps text-forest font-medium">File received</p>
                  <p className="max-w-full break-all text-[0.95rem] font-medium text-charcoal">{file.name}</p>
                  <p className="text-[0.8rem] text-ink-soft">
                    {formatBytes(file.size)} · text-based PDF required
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline mt-1 !py-1 !px-2.5 !text-[0.75rem]"
                    disabled={disabled}
                    onClick={() => {
                      onFileChange(null)
                      onFileError(null)
                      inputRef.current?.focus()
                    }}
                  >
                    Remove file
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[0.9375rem] text-ink-soft">
                    Drop a text-based PDF here, or choose a file
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={disabled}
                    onClick={() => inputRef.current?.click()}
                  >
                    Choose PDF
                  </button>
                  <p className="max-w-[26rem] text-[0.76rem] leading-relaxed text-ink-faint">
                    Max 8 MB. Scanned or image-only PDFs cannot be read — OCR is not supported, so
                    paste the text instead.
                  </p>
                </>
              )}
            </div>
            {fileError && (
              <p role="alert" className="text-[0.8rem] font-medium text-brick">
                {fileError}
              </p>
            )}
          </>
        ) : (
          <>
            <label htmlFor="source-text" className="sr-only">
              Source document text
            </label>
            <textarea
              id="source-text"
              className="field min-h-[180px] flex-1 resize-y text-[0.9375rem]"
              placeholder="Paste the source document here — the policy, report, contract or article the answer is supposed to be based on."
              value={sourceText}
              disabled={disabled}
              onChange={(e) => onSourceTextChange(e.target.value)}
              spellCheck={false}
            />
            <div className="flex items-center justify-between text-[0.76rem] text-ink-faint">
              <span>
                {chars > 0
                  ? `${chars.toLocaleString()} characters · ${pages} ${pages === 1 ? 'page' : 'pages'}`
                  : 'Nothing pasted yet'}
              </span>
              <span className="hidden sm:inline">
                Form-feed characters are preserved as page boundaries
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

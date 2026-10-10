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
}

const MAX_PDF_BYTES = 8 * 1024 * 1024

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
  }

  const chars = sourceText.trim().length
  const pageCount = sourceText.includes('\f')
    ? sourceText.split('\f').filter((p) => p.trim()).length || 1
    : 1

  return (
    <section className="panel flex flex-col" aria-labelledby="source-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <p className="caps">Step 1</p>
          <h2 id="source-heading" className="mt-0.5 text-[1.05rem] font-semibold leading-tight text-charcoal">
            Source document
          </h2>
        </div>
        <div className="flex rounded-md border border-line bg-ivory p-0.5" role="group" aria-label="Source input method">
          {(['text', 'pdf'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(m)}
              aria-pressed={mode === m}
              className={`rounded px-2.5 py-1 text-[0.75rem] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === m
                  ? 'bg-crimson text-white shadow-xs'
                  : 'text-ink-soft hover:text-charcoal'
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
              className={`flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-md border border-dashed px-5 py-7 text-center transition-colors ${
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
              className="field min-h-[168px] flex-1 resize-y text-[0.9375rem]"
              placeholder="Paste the source document here — the policy, report, contract or article the answer is supposed to be based on."
              value={sourceText}
              disabled={disabled}
              onChange={(e) => onSourceTextChange(e.target.value)}
              spellCheck={false}
            />
            <div className="flex items-center justify-between text-[0.76rem] text-ink-faint">
              <span>
                {chars > 0
                  ? `${chars.toLocaleString()} characters · ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`
                  : 'Nothing pasted yet'}
              </span>
              <span>Page breaks (form feed) are preserved as page boundaries</span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

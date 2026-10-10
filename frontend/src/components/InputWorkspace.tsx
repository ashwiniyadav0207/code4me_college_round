import AnswerPanel from './AnswerPanel'
import SourcePanel from './SourcePanel'

interface Props {
  mode: 'pdf' | 'text'
  onModeChange: (mode: 'pdf' | 'text') => void
  file: File | null
  onFileChange: (file: File | null) => void
  fileError: string | null
  onFileError: (message: string | null) => void
  sourceText: string
  onSourceTextChange: (value: string) => void
  answer: string
  onAnswerChange: (value: string) => void
  onAnalyse: () => void
  onReset: () => void
  loading: boolean
}

export default function InputWorkspace({
  mode,
  onModeChange,
  file,
  onFileChange,
  fileError,
  onFileError,
  sourceText,
  onSourceTextChange,
  answer,
  onAnswerChange,
  onAnalyse,
  onReset,
  loading,
}: Props) {
  const hasSource = mode === 'pdf' ? file !== null : sourceText.trim().length > 0
  const hasAnswer = answer.trim().length > 0
  const answerTooLong = answer.length > 40_000
  const canSubmit = hasSource && hasAnswer && !answerTooLong && !fileError && !loading

  return (
    <section className="mx-auto max-w-[1200px] px-5 pt-8 sm:px-8" aria-label="Input workspace">
      <div className="grid gap-5 lg:grid-cols-2">
        <SourcePanel
          mode={mode}
          onModeChange={onModeChange}
          file={file}
          onFileChange={onFileChange}
          fileError={fileError}
          onFileError={onFileError}
          sourceText={sourceText}
          onSourceTextChange={onSourceTextChange}
          disabled={loading}
        />
        <AnswerPanel answer={answer} onChange={onAnswerChange} disabled={loading} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <p className="max-w-[38rem] text-[0.8rem] leading-relaxed text-ink-faint">
          {hasSource && hasAnswer
            ? 'Ready. The answer will be split into claims and checked against the source you supplied.'
            : `Provide ${hasSource ? 'the AI answer' : hasAnswer ? 'a source document' : 'a source document and the AI answer'} to begin.`}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={onReset}
            disabled={loading || (!hasSource && !hasAnswer)}
          >
            Clear all
          </button>
          <button
            type="button"
            className="btn btn-primary min-w-[190px]"
            onClick={onAnalyse}
            disabled={!canSubmit}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Analysing…
              </>
            ) : (
              'Analyse answer'
            )}
          </button>
        </div>
      </div>
    </section>
  )
}

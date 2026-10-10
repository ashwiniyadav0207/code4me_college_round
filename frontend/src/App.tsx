import { useEffect, useRef, useState } from 'react'
import { ApiError, analyse } from './api'
import ErrorBanner from './components/ErrorBanner'
import Header from './components/Header'
import LoadingState from './components/LoadingState'
import Footer from './components/Footer'
import InputWorkspace from './components/InputWorkspace'
import Intro from './components/Intro'
import Results from './components/Results'
import type { AnalyseResult } from './types'

export default function App() {
  const [mode, setMode] = useState<'pdf' | 'text'>('text')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [sourceText, setSourceText] = useState('')
  const [answer, setAnswer] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyseResult | null>(null)

  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  const reset = () => {
    setMode('text')
    setFile(null)
    setFileError(null)
    setSourceText('')
    setAnswer('')
    setResult(null)
    setError(null)
    setLoading(false)
  }

  const run = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const data = await analyse({
        answer,
        sourceText,
        file: mode === 'pdf' ? file : null,
      })
      setResult(data)
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {!result && <Intro />}

        <InputWorkspace
          mode={mode}
          onModeChange={setMode}
          file={file}
          onFileChange={setFile}
          fileError={fileError}
          onFileError={setFileError}
          sourceText={sourceText}
          onSourceTextChange={setSourceText}
          answer={answer}
          onAnswerChange={setAnswer}
          onAnalyse={run}
          onReset={reset}
          loading={loading}
        />

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        {loading && <LoadingState />}

        <div ref={resultsRef}>
          {result && !loading && <Results result={result} answer={answer} />}
        </div>
      </main>

      <Footer />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { ApiError, analyse } from './api'
import ErrorBanner from './components/ErrorBanner'
import Header from './components/Header'
import LoadingState from './components/LoadingState'
import Footer from './components/Footer'
import InputWorkspace from './components/InputWorkspace'
import Intro from './components/Intro'
import Results from './components/Results'
import ContactPage from './components/ContactPage'
import type { AnalyseResult } from './types'

type Page = 'investigate' | 'contact'

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('second-opinion-theme')
      if (saved === 'dark' || saved === 'light') return saved
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return 'light'
  })

  // Hash-based view routing: no router dependency, and a reload keeps the view.
  const [page, setPage] = useState<Page>(() =>
    typeof window !== 'undefined' && window.location.hash === '#contact' ? 'contact' : 'investigate',
  )

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
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('second-opinion-theme', theme)
  }, [theme])

  // Effects toggle initial value so the cursor overlay can read it on mount.
  useEffect(() => {
    if (!document.documentElement.getAttribute('data-effects')) {
      document.documentElement.setAttribute('data-effects', 'on')
    }
  }, [])

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result])

  const navigate = (next: Page) => {
    setPage(next)
    window.location.hash = next === 'contact' ? 'contact' : ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-ivory text-charcoal transition-colors duration-150">
      <Header theme={theme} onToggleTheme={toggleTheme} page={page} onNavigate={navigate} />

      <main className="relative z-10 flex-1">
        {page === 'contact' ? (
          <ContactPage onBack={() => navigate('investigate')} />
        ) : (
          <>
            {!result && <Intro theme={theme} />}

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

            {error && (
              <ErrorBanner message={error} onDismiss={() => setError(null)} onRetry={run} />
            )}
            {loading && <LoadingState />}

            <div ref={resultsRef}>
              {result && !loading && (
                <Results
                  result={result}
                  answer={answer}
                  sourceText={sourceText}
                  file={mode === 'pdf' ? file : null}
                  onReset={reset}
                />
              )}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

import type { AnalyseResult } from './types'

export class ApiError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

interface AnalyseInput {
  answer: string
  sourceText: string
  file: File | null
}

function messageFrom(data: any): { code: string; message: string } | null {
  if (!data) return null
  const detail = data.detail ?? data.error ?? null
  if (typeof detail === 'string') return { code: 'error', message: detail }
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return { code: String(detail.code ?? 'error'), message: detail.message }
  }
  return null
}

/** Send the source + answer to FastAPI and return the audit payload. */
export async function analyse(input: AnalyseInput): Promise<AnalyseResult> {
  const form = new FormData()
  form.append('answer', input.answer)
  if (input.file) {
    form.append('pdf', input.file, input.file.name)
  } else {
    form.append('source_text', input.sourceText)
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 240_000)

  try {
    const response = await fetch('/api/analyse', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })

    let data: any = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      const parsed = messageFrom(data)
      throw new ApiError(
        response.status,
        parsed?.code ?? 'error',
        parsed?.message ?? `The server could not complete the request (HTTP ${response.status}).`,
      )
    }
    return data as AnalyseResult
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        408,
        'timeout',
        'The analysis took too long and was cancelled. Try a shorter source or answer.',
      )
    }
    throw new ApiError(
      0,
      'network',
      'Could not reach the analysis server. Make sure the FastAPI server is running on port 8000, then try again.',
    )
  } finally {
    window.clearTimeout(timer)
  }
}

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

export interface RepairInput {
  claimText: string
  answer?: string
  claimType?: string
  originalVerdict?: string
  sourceText: string
  file: File | null
}

/** One-click truth repair: ask the backend for a source-grounded replacement. */
export async function repairClaim(input: RepairInput): Promise<import('./types').RepairResult> {
  const form = new FormData()
  form.append('claim_text', input.claimText)
  if (input.answer) form.append('answer', input.answer)
  if (input.claimType) form.append('claim_type', input.claimType)
  if (input.originalVerdict) form.append('original_verdict', input.originalVerdict)
  if (input.file) {
    form.append('pdf', input.file, input.file.name)
  } else {
    form.append('source_text', input.sourceText)
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 120_000)

  try {
    const response = await fetch('/api/repair', {
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
        parsed?.message ?? `The repair request failed (HTTP ${response.status}).`,
      )
    }
    return data as import('./types').RepairResult
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(408, 'timeout', 'The repair request took too long and timed out.')
    }
    throw new ApiError(0, 'network', 'Could not reach the repair server on port 8000.')
  } finally {
    window.clearTimeout(timer)
  }
}

export interface FeedbackInput {
  kind: 'error' | 'feedback' | 'contact'
  message: string
  email?: string
  includeContext?: boolean
  claimContext?: string
}

export interface FeedbackReceipt {
  reference: string
}

/** Submit the contact/feedback form. The server stores it before anything else. */
export async function submitFeedback(input: FeedbackInput): Promise<FeedbackReceipt> {
  const form = new FormData()
  form.append('kind', input.kind)
  form.append('message', input.message)
  if (input.email) form.append('email', input.email)
  form.append('include_context', input.includeContext ? 'true' : 'false')
  if (input.claimContext) form.append('claim_context', input.claimContext)
  // Honeypot: humans never fill this, because the field is off-screen.
  form.append('company', '')

  try {
    const response = await fetch('/api/feedback', { method: 'POST', body: form })

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
        parsed?.message ?? `The message could not be sent (HTTP ${response.status}).`,
      )
    }
    return data as FeedbackReceipt
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError(0, 'network', 'Could not reach the server. Check your connection and retry.')
  }
}

export interface CourtroomInput {
  claimText: string
  answer?: string
  claimVerdict?: string
  sourceText: string
  file: File | null
}

/** AI Courtroom: stage prosecutor, defender, and judge for one claim. */
export async function courtroomClaim(input: CourtroomInput): Promise<import('./types').CourtroomResult> {
  const form = new FormData()
  form.append('claim_text', input.claimText)
  if (input.answer) form.append('answer', input.answer)
  if (input.claimVerdict) form.append('claim_verdict', input.claimVerdict)
  if (input.file) {
    form.append('pdf', input.file, input.file.name)
  } else {
    form.append('source_text', input.sourceText)
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 180_000)

  try {
    const response = await fetch('/api/courtroom', {
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
        parsed?.message ?? `The courtroom hearing failed (HTTP ${response.status}).`,
      )
    }
    return data as import('./types').CourtroomResult
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(408, 'timeout', 'The courtroom hearing took too long and timed out.')
    }
    throw new ApiError(0, 'network', 'Could not reach the courtroom server on port 8000.')
  } finally {
    window.clearTimeout(timer)
  }
}

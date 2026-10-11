import { useState } from 'react'
import { ApiError, submitFeedback } from '../api'

interface Props {
  onBack?: () => void
}

type Kind = 'error' | 'feedback' | 'contact'

const KINDS: Array<{ id: Kind; label: string; hint: string }> = [
  { id: 'feedback', label: 'Feedback', hint: 'Tell us what worked or what did not' },
  { id: 'error', label: 'Report an error', hint: 'Something looked wrong or broken' },
  { id: 'contact', label: 'Contact', hint: 'A question for the team' },
]

const MIN_CHARS = 10
const MAX_CHARS = 4000

/**
 * Contact and feedback.
 *
 * This form genuinely submits: it POSTs to /api/feedback, which validates,
 * rate-limits and stores the message server-side. The team's address is read
 * from configuration — if it is not set, no contact line is rendered, because
 * inventing one would be a lie.
 */
export default function ContactPage({ onBack }: Props) {
  const [kind, setKind] = useState<Kind>('feedback')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [includeContext, setIncludeContext] = useState(false)
  const [claimContext, setClaimContext] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [reference, setReference] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    const trimmed = message.trim()
    if (trimmed.length < MIN_CHARS) {
      errors.message = `Please write at least ${MIN_CHARS} characters.`
    } else if (trimmed.length > MAX_CHARS) {
      errors.message = `Please keep the message under ${MAX_CHARS.toLocaleString()} characters.`
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'That email address does not look valid.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setReference(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await submitFeedback({
        kind,
        message: message.trim(),
        email: email.trim() || undefined,
        includeContext,
        claimContext: includeContext ? claimContext : undefined,
      })
      setReference(res.reference)
      setMessage('')
      setEmail('')
      setIncludeContext(false)
      setClaimContext('')
      setFieldErrors({})
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : 'The message could not be sent. Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:items-start">
        {/* Left: what this product is */}
        <div>
          <p className="caps mb-3 font-semibold text-crimson">Contact</p>
          <h1 className="text-[clamp(1.7rem,3.4vw,2.4rem)] leading-[1.12] text-charcoal">
            Tell us what the audit got right — or wrong.
          </h1>
          <p className="mt-4 max-w-[46ch] text-[0.98rem] leading-relaxed text-ink-soft">
            VeriFact checks an AI answer against the document you supply. If a verdict looked
            unfair, a quotation was misplaced, or something simply felt broken, this is the place
            to say so.
          </p>

          <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper p-4">
            <p className="caps mb-2 text-[0.66rem]">Privacy</p>
            <p className="text-[0.85rem] leading-relaxed text-ink-soft">
              We never include your source document or the answer you audited unless you explicitly
              opt in below. The optional context attaches only the verdict and claim ids.
            </p>
          </div>

          {onBack && (
            <button type="button" onClick={onBack} className="btn btn-quiet mt-5">
              ← Back to investigation
            </button>
          )}
        </div>

        {/* Right: the form */}
        <form onSubmit={handleSubmit} noValidate className="panel p-5 sm:p-6">
          <fieldset className="mb-5">
            <legend className="caps mb-2 text-[0.66rem]">What is this about?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  aria-pressed={kind === k.id}
                  title={k.hint}
                  className={`rounded-[var(--radius-control)] border px-3 py-2 text-left transition-colors ${
                    kind === k.id
                      ? 'border-crimson bg-crimson-soft text-charcoal'
                      : 'border-line bg-paper text-ink-soft hover:border-line-strong'
                  }`}
                >
                  <span className="block text-[0.85rem] font-semibold">{k.label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mb-4">
            <label htmlFor="feedback-message" className="caps mb-1.5 block text-[0.66rem]">
              Message <span className="text-brick">*</span>
            </label>
            <textarea
              id="feedback-message"
              className={`field min-h-[150px] resize-y ${fieldErrors.message ? 'border-brick' : ''}`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened, what you expected, and the page or claim it involved."
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={fieldErrors.message ? 'feedback-message-error' : undefined}
            />
            <div className="mt-1 flex items-center justify-between text-[0.74rem]">
              <span id="feedback-message-error" role="alert" className="font-medium text-brick">
                {fieldErrors.message ?? ''}
              </span>
              <span className={message.length > MAX_CHARS ? 'font-medium text-brick' : 'text-ink-faint'}>
                {message.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="feedback-email" className="caps mb-1.5 block text-[0.66rem]">
              Your email <span className="font-normal normal-case tracking-normal text-ink-faint">(only if you want a reply)</span>
            </label>
            <input
              id="feedback-email"
              type="email"
              className={`field ${fieldErrors.email ? 'border-brick' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'feedback-email-error' : undefined}
            />
            <p id="feedback-email-error" role="alert" className="mt-1 text-[0.74rem] font-medium text-brick">
              {fieldErrors.email ?? ''}
            </p>
          </div>

          <div className="mb-5 rounded-[var(--radius-control)] border border-line bg-ivory-deep p-3">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-crimson)]"
                checked={includeContext}
                onChange={(e) => setIncludeContext(e.target.checked)}
              />
              <span className="text-[0.84rem] leading-relaxed text-ink-soft">
                Include this claim's verdict and ids
                <span className="block text-[0.76rem] text-ink-faint">
                  Never your source text or the audited answer.
                </span>
              </span>
            </label>

            {includeContext && (
              <textarea
                className="field mt-3 min-h-[70px] resize-y !text-[0.82rem]"
                value={claimContext}
                onChange={(e) => setClaimContext(e.target.value)}
                placeholder="Paste the claim id, verdict or page reference here (optional)."
                aria-label="Claim context to include"
              />
            )}
          </div>

          {/* Honeypot — hidden from humans, attractive to bots */}
          <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
            <label htmlFor="feedback-company">Company</label>
            <input id="feedback-company" type="text" name="company" tabIndex={-1} autoComplete="off" />
          </div>

          {formError && (
            <div role="alert" className="mb-4 rounded-[var(--radius-control)] border border-brick/40 bg-brick-surface px-4 py-3">
              <p className="text-[0.85rem] font-semibold text-brick">Could not send</p>
              <p className="mt-1 text-[0.84rem] leading-relaxed text-charcoal">{formError}</p>
            </div>
          )}

          {reference && (
            <div role="status" className="mb-4 rounded-[var(--radius-control)] border border-forest/40 bg-sage-soft px-4 py-3">
              <p className="text-[0.85rem] font-semibold text-forest">Received. Reference #{reference}</p>
              <p className="mt-1 text-[0.84rem] leading-relaxed text-ink-soft">
                Thank you — the team will read it.
              </p>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={submitting} aria-busy={submitting}>
            {submitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Sending…
              </>
            ) : (
              'Send message'
            )}
          </button>
        </form>
      </div>
    </section>
  )
}

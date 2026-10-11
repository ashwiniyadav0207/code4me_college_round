import { useEffect, useState } from 'react'

/**
 * Effects on/off toggle for the dark-mode cursor trail and panel motion.
 *
 * The spec requires: saved to localStorage, honoured on load, and it must
 * actually disable the effects (we set data-effects on <html>, which the CSS
 * uses to collapse every animation, and the cursor overlay reads before it
 * mounts its animation loop).
 */
const STORAGE_KEY = 'second-opinion-effects'

function readInitial(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export default function EffectsToggle() {
  const [enabled, setEnabled] = useState(readInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-effects', enabled ? 'on' : 'off')
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
    } catch {
      // storage unavailable — the attribute still applies for this session
    }
  }, [enabled])

  return (
    <button
      type="button"
      onClick={() => setEnabled((v) => !v)}
      aria-pressed={enabled}
      title={
        enabled
          ? 'Effects on — click to remove the cursor trail and motion'
          : 'Effects off — click to restore the cursor trail and motion'
      }
      className="flex items-center gap-1.5 rounded-full border border-line bg-paper/70 px-2.5 py-1 text-[0.75rem] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-charcoal"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {enabled ? (
          <>
            <path d="M2 11c2.5-4 9.5-4 12 0" strokeLinecap="round" />
            <circle cx="8" cy="5" r="1.6" fill="currentColor" stroke="none" />
          </>
        ) : (
          <>
            <path d="M2 11c1.2-2 3-3.1 5-3.4M14 11c-1.2-2-3-3.1-5-3.4" strokeLinecap="round" />
            <path d="M2 2l12 12" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span className="hidden sm:inline">{enabled ? 'Effects on' : 'Effects off'}</span>
    </button>
  )
}

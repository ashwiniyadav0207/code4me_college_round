interface ThemeToggleProps {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <div
      className="flex items-center rounded-md border border-line bg-ivory-deep/60 p-0.5 shadow-xs transition-colors"
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => theme !== 'light' && onToggle()}
        aria-pressed={theme === 'light'}
        aria-label="Switch to light mode"
        className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.75rem] font-medium transition-colors ${
          theme === 'light'
            ? 'bg-forest text-white shadow-xs'
            : 'text-ink-soft hover:text-charcoal'
        }`}
        title="Light Mode (Warm Editorial)"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
          <circle cx="8" cy="8" r="3" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M12.95 3.05l-1.41 1.41M4.46 11.54l-1.41 1.41"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => theme !== 'dark' && onToggle()}
        aria-pressed={theme === 'dark'}
        aria-label="Switch to dark mode"
        className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.75rem] font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-crimson text-white shadow-xs'
            : 'text-ink-soft hover:text-charcoal'
        }`}
        title="Dark Mode (Spider-Verse)"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
          <path d="M6 2a1 1 0 0 1 1-1 7 7 0 1 0 7 7 1 1 0 0 1-1.32-.95A6 6 0 0 1 6 2z" />
        </svg>
        <span>Dark</span>
      </button>
    </div>
  )
}

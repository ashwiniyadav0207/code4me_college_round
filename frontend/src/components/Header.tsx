import ThemeToggle from './ThemeToggle'
import EffectsToggle from './EffectsToggle'

interface Props {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  /** Which top-level view is active, used for the nav's current state. */
  page?: 'investigate' | 'contact'
  onNavigate?: (page: 'investigate' | 'contact') => void
}

/**
 * Slim sticky top bar: wordmark left, Investigate / Contact centre,
 * theme + effects toggles right. Glass in both themes (with opaque
 * fallbacks for prefers-reduced-transparency / prefers-contrast).
 *
 * No Sign in control: authentication is deferred and a login that
 * authenticates nothing would be deceptive.
 */
export default function Header({ theme, onToggleTheme, page = 'investigate', onNavigate }: Props) {
  const navItems: Array<{ id: 'investigate' | 'contact'; label: string }> = [
    { id: 'investigate', label: 'Investigate' },
    { id: 'contact', label: 'Contact' },
  ]

  return (
    <header className="header-strip glass sticky top-0 z-30">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 sm:px-8">
        <button
          type="button"
          onClick={() => onNavigate?.('investigate')}
          className="flex items-center gap-2.5 text-left"
          aria-label="VeriFact Second Opinion — go to Investigate"
        >
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
              <g stroke="currentColor" strokeWidth="1.15" strokeLinecap="round">
                <circle cx="16" cy="16" r="9" />
                <path d="M16 7 V25 M7 16 H25 M10 10 L22 22 M22 10 L10 22" />
              </g>
              <ellipse cx="16" cy="14.2" rx="2.15" ry="1.7" fill="var(--color-crimson)" />
              <ellipse cx="16" cy="18.3" rx="2.7" ry="2.35" fill="currentColor" />
            </svg>
          </div>
          <div className="leading-none">
            <div className="text-[1.02rem] font-bold tracking-tight text-charcoal dark:font-display-dark dark:text-[1.15rem] dark:uppercase">
              Second <span className="text-crimson">Opinion</span>
            </div>
            <div className="mt-1 hidden text-[0.72rem] text-ink-faint sm:block">
              A VeriFact tool
            </div>
          </div>
        </button>

        <nav className="order-3 flex items-center gap-1 sm:order-none" aria-label="Primary">
          {navItems.map((item) => {
            const current = page === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate?.(item.id)}
                aria-current={current ? 'page' : undefined}
                className={`rounded-full px-3 py-1 text-[0.82rem] font-medium transition-colors ${
                  current
                    ? 'bg-charcoal text-white dark:bg-crimson dark:text-white'
                    : 'text-ink-soft hover:text-charcoal'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <EffectsToggle />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  )
}

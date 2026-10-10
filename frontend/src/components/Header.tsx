import ThemeToggle from './ThemeToggle'

interface Props {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function Header({ theme, onToggleTheme }: Props) {
  return (
    <header className="header-strip relative z-20">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3.5 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-3.5">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
              <g stroke="#F4EFE6" strokeWidth="1.15" strokeLinecap="round">
                <circle cx="16" cy="16" r="9" />
                <path d="M16 7 V25 M7 16 H25 M10 10 L22 22 M22 10 L10 22" />
              </g>
              <ellipse cx="16" cy="14.2" rx="2.15" ry="1.7" fill="#C8102E" />
              <ellipse cx="16" cy="18.3" rx="2.7" ry="2.35" fill="#F4EFE6" />
              <g stroke="#F4EFE6" strokeWidth="1.2" strokeLinecap="round">
                <path d="M14.1 14.5 L8.8 11 M13.5 15.6 L8 16.5 M13.7 17.7 L8.8 21.2 M14.5 19 L11 23.4" />
                <path d="M17.9 14.5 L23.2 11 M18.5 15.6 L24 16.5 M18.3 17.7 L23.2 21.2 M17.5 19 L21 23.4" />
              </g>
            </svg>
          </div>
          <div>
            <div className="caps mb-0.5 text-crimson font-semibold">VeriFact</div>
            <div className="text-[1.35rem] font-bold leading-none tracking-tight text-charcoal sm:text-[1.45rem] dark:font-display dark:tracking-[0.02em] dark:uppercase">
              Second <span className="text-crimson">Opinion</span>
            </div>
            <div className="mt-1 text-[0.78rem] text-ink-soft">
              Evidence-grounded answer auditing
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="status-chip flex items-center gap-2 px-3 py-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-crimson" aria-hidden="true" />
            <span className="text-[0.75rem] font-medium text-charcoal">
              Source-bound · checks run against your document only
            </span>
          </div>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  )
}

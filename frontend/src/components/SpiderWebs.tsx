/**
 * Hand-Crafted Spider-Verse Comic Hero Vignette
 * Contained entirely in the upper-right corner of the hero section for Dark Mode.
 * Mathematically composed radial geometry, smooth catenary cross-strands,
 * selective Spider-Man red highlights, subtle halftone print dots, and
 * restrained electric-blue chromatic accents.
 * 
 * COMPLETELY ABSENT in Light Mode.
 */

export function SpiderVerseHeroVignette({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute -top-4 right-0 sm:right-2 lg:right-6 z-0 select-none spider-vignette hidden dark:block ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 280 280"
        fill="none"
        className="h-56 w-56 sm:h-64 sm:w-64 lg:h-72 lg:w-72 drop-shadow-[0_0_12px_rgba(255,23,68,0.15)]"
      >
        <defs>
          {/* Subtle Comic-Book Ben-Day Halftone Dot Pattern */}
          <pattern id="spider-halftone" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.1" fill="var(--color-crimson, #ff1744)" opacity="0.35" />
          </pattern>
        </defs>

        {/* Angular Comic Graphic Accent Shapes in the Corner */}
        <polygon points="270,0 270,55 215,0" fill="url(#spider-halftone)" />
        <polygon points="270,0 270,22 248,0" fill="var(--color-crimson, #ff1744)" opacity="0.25" />
        <line x1="270" y1="35" x2="235" y2="0" stroke="var(--color-crimson, #ff1744)" strokeWidth="1.5" opacity="0.75" />

        {/* Comic Registration Crosshair in Corner */}
        <g stroke="var(--color-crimson, #ff1744)" strokeWidth="1" opacity="0.6">
          <line x1="258" y1="12" x2="266" y2="12" />
          <line x1="262" y1="8" x2="262" y2="16" />
        </g>

        {/* Recognisable Radial Strands (Spokes) originating from Anchor Point (270, 0) */}
        <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-zinc-200 opacity-40">
          <line x1="270" y1="0" x2="5.0" y2="0.0" />
          <line x1="270" y1="0" x2="11.6" y2="59.0" />
          <line x1="270" y1="0" x2="31.2" y2="115.0" />
          <line x1="270" y1="0" x2="62.8" y2="165.2" />
          <line x1="270" y1="0" x2="104.8" y2="207.2" />
          <line x1="270" y1="0" x2="155.0" y2="238.8" />
          <line x1="270" y1="0" x2="211.0" y2="258.4" />
          <line x1="270" y1="0" x2="270.0" y2="265.0" />
        </g>

        {/* Main Anchor Diagonal Spoke with Selective Red Comic Stroke */}
        <line x1="270" y1="0" x2="104.8" y2="207.2" stroke="var(--color-crimson, #ff1744)" strokeWidth="1.6" opacity="0.8" />

        {/* Smooth, Evenly Spaced Curved Cross-Strands (Catenary Arcs) */}
        {/* Ring 1 (r=45, off-white ink) */}
        <path
          d="M 225.0 0.0 Q 230.9 4.4 226.1 10.0 Q 232.9 13.0 229.5 19.5 Q 236.7 20.9 234.8 28.1 Q 242.2 27.8 241.9 35.2 Q 249.1 33.3 250.5 40.5 Q 257.0 37.1 260.0 43.9 Q 265.6 39.1 270.0 45.0"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          className="text-zinc-200 opacity-40"
        />

        {/* Ring 2 (r=92, Selective Spider-Man Red Comic Highlight) */}
        <path
          d="M 178.0 0.0 Q 190.1 9.0 180.3 20.5 Q 194.1 26.6 187.1 39.9 Q 201.9 42.8 198.1 57.4 Q 213.1 56.9 212.6 71.9 Q 227.2 68.1 230.1 82.9 Q 243.4 75.9 249.5 89.7 Q 261.0 79.9 270.0 92.0"
          stroke="var(--color-crimson, #ff1744)"
          strokeWidth="1.55"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Ring 3 (r=142, off-white ink) */}
        <path
          d="M 128.0 0.0 Q 146.6 13.9 131.6 31.6 Q 152.8 41.0 142.1 61.6 Q 164.9 66.1 159.0 88.5 Q 182.2 87.8 181.5 111.0 Q 203.9 105.1 208.4 127.9 Q 229.0 117.2 238.4 138.4 Q 256.1 123.4 270.0 142.0"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          className="text-zinc-200 opacity-40"
        />

        {/* Secondary Crimson Comic Stroke along Ring 3 */}
        <path
          d="M 126.5 1.5 Q 145.1 15.4 130.1 33.1 Q 151.3 42.5 140.6 63.1 Q 163.4 67.6 157.5 90.0 Q 180.7 89.3 180.0 112.5 Q 202.4 106.6 206.9 129.4 Q 227.5 118.7 236.9 139.9 Q 254.6 124.9 268.5 143.5"
          stroke="var(--color-crimson, #ff1744)"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Ring 4 (r=196, Selective Spider-Man Red Comic Highlight) */}
        <path
          d="M 74.0 0.0 Q 99.7 19.2 78.9 43.6 Q 108.2 56.6 93.4 85.0 Q 124.9 91.2 116.8 122.2 Q 148.8 121.2 147.8 153.2 Q 178.8 145.1 185.0 176.6 Q 213.4 161.8 226.4 191.1 Q 250.8 170.3 270.0 196.0"
          stroke="var(--color-crimson, #ff1744)"
          strokeWidth="1.55"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Ring 5 (r=252, off-white ink outer boundary) */}
        <path
          d="M 18.0 0.0 Q 51.0 24.7 24.3 56.1 Q 62.0 72.8 43.0 109.3 Q 83.4 117.2 73.0 157.1 Q 114.2 155.8 112.9 197.0 Q 152.8 186.6 160.7 227.0 Q 197.2 208.0 213.9 245.7 Q 245.3 219.0 270.0 252.0"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          className="text-zinc-200 opacity-40"
        />

        {/* Tension Ink Nodes at Intersections along Red Rings 2 and 4 */}
        <g fill="var(--color-crimson, #ff1744)" opacity="0.95">
          {/* Ring 2 nodes */}
          <circle cx="180.3" cy="20.5" r="2" />
          <circle cx="187.1" cy="39.9" r="2" />
          <circle cx="198.1" cy="57.4" r="2" />
          <circle cx="212.6" cy="71.9" r="2" />
          <circle cx="230.1" cy="82.9" r="2" />
          <circle cx="249.5" cy="89.7" r="2" />
          {/* Ring 4 nodes */}
          <circle cx="78.9" cy="43.6" r="2.2" />
          <circle cx="93.4" cy="85.0" r="2.2" />
          <circle cx="116.8" cy="122.2" r="2.2" />
          <circle cx="147.8" cy="153.2" r="2.2" />
          <circle cx="185.0" cy="176.6" r="2.2" />
          <circle cx="226.4" cy="191.1" r="2.2" />
        </g>

        {/* Singular Corner Anchor Node */}
        <circle cx="270" cy="0" r="7.5" stroke="var(--color-crimson, #ff1744)" strokeWidth="1.8" fill="none" opacity="0.85" />
        <circle cx="270" cy="0" r="3.5" fill="var(--color-crimson, #ff1744)" />
      </svg>
    </div>
  )
}

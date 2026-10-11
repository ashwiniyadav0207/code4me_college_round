const cx = 600
const cy = 0

const angles = Array.from({ length: 10 }, (_, index) => 90 + index * 10)
const webRings = [48, 82, 122, 170, 225, 290, 365, 445, 530]

const point = (angle: number, radius: number) => {
  const radians = (angle * Math.PI) / 180

  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

const radialStrands = angles.map((angle) => {
  const end = point(angle, 760)

  return `M ${cx} ${cy} L ${end.x} ${end.y}`
})

const connectingStrands = webRings.flatMap((radius, ringIndex) =>
  angles.slice(0, -1).map((angle, segmentIndex) => {
    const start = point(angle, radius)
    const end = point(angle + 10, radius)
    const bulge = 5 + ((ringIndex + segmentIndex) % 3) * 2
    const control = point(angle + 5, radius + bulge)

    return (
      `M ${start.x} ${start.y} ` +
      `Q ${control.x} ${control.y} ${end.x} ${end.y}`
    )
  }),
)

export function SpiderVerseHeroVignette({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none relative top-0 right-0 z-0 h-[clamp(12rem,52vw,17rem)] w-full select-none spider-vignette overflow-hidden hidden dark:block xl:absolute xl:h-auto xl:w-auto ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 600 480"
        preserveAspectRatio="xMaxYMin meet"
        aria-hidden="true"
        focusable="false"
        className="spider-web-art h-56 w-56 sm:h-72 sm:w-72 lg:h-[26rem] lg:w-[26rem]"
      >
        <g
          fill="none"
          stroke="#ff1744"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {radialStrands.map((d, index) => (
            <path key={`spoke-${index}`} d={d} opacity="0.82" />
          ))}

          {connectingStrands.map((d, index) => (
            <path key={`strand-${index}`} d={d} opacity="0.72" />
          ))}
        </g>
      </svg>
    </div>
  )
}

interface PencilBarProps {
  value: number        // 0 to 1
  color?: string       // optional override, defaults to #FFD600
  height?: number      // px, defaults to 14
}

export function PencilBar({ value, color = "#FFD600", height = 14 }: PencilBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100))
  return (
    <div
      className="pencil-bar"
      style={{ height }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="pencil-bar-fill" style={{ width: `${pct}%`, background: color }}>
        <svg
          style={{
            position: "absolute",
            right: -8,
            top: 0,
            height: "100%",
            width: 8,
            display: "block",
            flexShrink: 0,
          }}
          viewBox="0 0 8 14"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <polygon points="0,0 8,7 0,14" fill={color} />
        </svg>
      </div>
    </div>
  )
}

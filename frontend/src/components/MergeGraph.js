const BRANCHES = [
  { label: 'tasks', y: 40, delay: 0 },
  { label: 'chat', y: 100, delay: 90 },
  { label: 'files', y: 160, delay: 180 },
  { label: 'issues', y: 220, delay: 270 },
];

/**
 * The four scattered tools a dev team juggles, drawn as branch lines that
 * merge into one trunk — literally the product's pitch. Reused (smaller)
 * on auth screens so the visual identity carries through the whole flow.
 */
export default function MergeGraph({ className = '', compact = false }) {
  const trunkY = 130;
  const mergeX = compact ? 260 : 340;
  const endX = compact ? 380 : 560;

  return (
    <svg
      viewBox={`0 0 ${endX + 20} 260`}
      fill="none"
      className={`merge-graph ${className}`}
      aria-hidden="true"
    >
      {BRANCHES.map((b, i) => (
        <path
          key={b.label}
          className="branch-line"
          d={`M 20 ${b.y} C ${mergeX - 120} ${b.y}, ${mergeX - 60} ${trunkY}, ${mergeX} ${trunkY}`}
          stroke={i % 2 === 0 ? 'var(--color-brand)' : 'var(--color-muted)'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}
      <path
        className="trunk-line"
        d={`M ${mergeX} ${trunkY} L ${endX} ${trunkY}`}
        stroke="var(--color-signal)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {BRANCHES.map((b) => (
        <g key={`${b.label}-node`}>
          <circle
            className="node"
            style={{ animationDelay: `${b.delay + 900}ms` }}
            cx="20"
            cy={b.y}
            r="4.5"
            fill="var(--color-surface)"
            stroke="var(--color-brand)"
            strokeWidth="2"
          />
          {!compact && (
            <text
              x="32"
              y={b.y + 4}
              fontFamily="var(--font-mono)"
              fontSize="12"
              fill="var(--color-muted)"
            >
              {b.label}
            </text>
          )}
        </g>
      ))}

      <circle
        className="node"
        style={{ animationDelay: '1250ms' }}
        cx={endX}
        cy={trunkY}
        r="5.5"
        fill="var(--color-signal)"
      />
      {!compact && (
        <text
          x={endX - 108}
          y={trunkY - 14}
          fontFamily="var(--font-mono)"
          fontSize="12"
          fill="var(--color-signal)"
        >
          collabsphere
        </text>
      )}
    </svg>
  );
}

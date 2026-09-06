// Hand-rolled SVG charts — no chart library, fast + dependency-free.

export function BarChart({ data, height = 120, color = "#ffb347", format }: { data: { label: string; value: number }[]; height?: number; color?: string; format?: (n: number) => string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 100 / data.length;
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (height - 18));
          return (
            <rect
              key={i}
              x={i * w + w * 0.15}
              y={height - 14 - h}
              width={w * 0.7}
              height={h}
              rx="1.5"
              fill={color}
              opacity={0.85}
            >
              <title>{`${d.label}: ${format ? format(d.value) : d.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--dim)" }}>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function Sparkline({ points, height = 46, color = "#6ea8fe" }: { points: number[]; height?: number; color?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i / (points.length - 1)) * 100},${height - 4 - ((p - min) / span) * (height - 8)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function HBarList({ data, color = "#ffb347", format }: { data: { label: string; value: number; sub?: string }[]; color?: string; format?: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={d.label}>{d.sub ?? d.label}</span>
            <span className="mono" style={{ color: "var(--muted)" }}>{format ? format(d.value) : d.value}</span>
          </div>
          <div style={{ height: 5, background: "var(--bg-2)", borderRadius: 3 }}>
            <div style={{ height: 5, width: `${(d.value / max) * 100}%`, background: color, borderRadius: 3, opacity: 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

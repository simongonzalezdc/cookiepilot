// Hand-rolled SVG charts — no chart library, fast + dependency-free.
// Colors are applied via style props (not presentation attributes) so CSS
// variables resolve correctly in Safari and Chrome alike.

export function BarChart({
  data,
  height = 120,
  color = "var(--accent)",
  format,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  format?: (n: number) => string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 100 / data.length;
  const gradId = `bg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="chartwrap">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.95 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.35 }} />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (height - 18));
          return (
            <rect
              key={i}
              className="bar-rect"
              x={i * w + w * 0.18}
              y={height - 14 - h}
              width={w * 0.64}
              height={h}
              rx="1.5"
              style={{ fill: `url(#${gradId})`, opacity: 0.9 }}
            >
              <title>{`${d.label}: ${format ? format(d.value) : d.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="chartaxis">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function Sparkline({ points, height = 46, color = "var(--blue)" }: { points: number[]; height?: number; color?: string }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pts = points.map((p, i) => [(i / (points.length - 1)) * 100, height - 4 - ((p - min) / span) * (height - 8)] as const);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${path} L100,${height} L0,${height} Z`;
  const gradId = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={area} style={{ fill: `url(#${gradId})` }} />
      <path d={path} style={{ fill: "none", stroke: color }} strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function HBarList({
  data,
  color = "var(--accent)",
  format,
}: {
  data: { label: string; value: number; sub?: string }[];
  color?: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={d.label}>{d.sub ?? d.label}</span>
            <span className="mono" style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{format ? format(d.value) : d.value}</span>
          </div>
          <div style={{ height: 6, background: "var(--bg1)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: 6, width: `${(d.value / max) * 100}%`, background: color, borderRadius: 3, opacity: 0.9 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

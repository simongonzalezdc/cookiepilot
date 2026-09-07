/**
 * Hand-rolled SVG charts — no chart library, dependency-free.
 * v2: rendered in measured pixel space (uniform scale) so The Bite
 * keeps true circular geometry (DESIGN-SYSTEM v2 / AM-3).
 *
 * Bite geometry law:
 *  - one notch max per element, never crossing axes/labels/thresholds/
 *    the last data point/current value;
 *  - charts: chord = 10–14% of plot min-dimension, ~40° arc
 *    (depth = r(1−cos20°) ≈ 6% of r; chord = 2·r·sin20°);
 *  - meters: bite depth ≤ 8px, on the TRACK, never at the fill endpoint;
 *  - exact value printed beside every bitten element;
 *  - max two bitten elements per viewport.
 */
import { useEffect, useId, useRef, useState } from "react";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(e.contentRect.width);
    });
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** ~40°-arc bite from a chord width (chart elements). */
function biteFromChord(chord: number) {
  const r = chord / (2 * Math.sin(Math.PI / 9)); // sin20°
  const depth = r * (1 - Math.cos(Math.PI / 9)); // ≈ 0.0603 r
  return { r, depth };
}

interface BiteMaskProps {
  id: string;
  w: number;
  h: number;
  cx: number;
  cy: number;
  r: number;
}
/** SVG mask: white plot, black bite circle — the notch. */
function BiteMask({ id, w, h, cx, cy, r }: BiteMaskProps) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
      <rect x="0" y="0" width={w} height={h} fill="#fff" />
      <circle cx={cx} cy={cy} r={r} fill="#000" />
    </mask>
  );
}

export function BarChart({
  data,
  height = 130,
  color = "var(--ember)",
  format,
  allowBite = true,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  format?: (n: number) => string;
  /** AM-3: set false to keep this chart unbitten (viewport bite budget). */
  allowBite?: boolean;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const mid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (!data.length || w < 40) return <div ref={ref} style={{ height, display: "block" }} />;

  const axisH = 16;
  const plotH = height - axisH;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = w / data.length;
  const barW = slot * 0.64;

  // Bite eligibility (AM-3): dense charts stay unbitten; the bitten bar
  // is never among the last three points and keeps headroom for the
  // notch + printed value without crossing the plot top or neighbours.
  let bite: { i: number; cx: number; top: number; value: number; label: string } | null = null;
  const minChord = 0.1 * Math.min(w, plotH);
  const maxChord = 0.14 * Math.min(w, plotH);
  const chord = Math.min(Math.max(minChord, barW * 0.8), maxChord, barW * 0.8);
  const geo = biteFromChord(chord);
  if (allowBite && barW >= 18 && data.length > 4) {
    for (let i = data.length - 4; i >= 0; i--) {
      const h = Math.max(2, (data[i].value / max) * (plotH - 2));
      const top = plotH - h;
      // headroom for bite circle + value tag above the bar
      if (h >= geo.r + 8 && top >= geo.r + 20) {
        bite = { i, cx: i * slot + slot / 2, top, value: data[i].value, label: data[i].label };
        break;
      }
    }
  }

  return (
    <div className="chartwrap" ref={ref}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: "block" }} role="img" aria-label="bar chart">
        <defs>
          <linearGradient id={`bg${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.95 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0.35 }} />
          </linearGradient>
          {bite && (
            <BiteMask id={`bm${mid}`} w={w} h={height} cx={bite.cx} cy={bite.top - geo.r + geo.depth} r={geo.r} />
          )}
        </defs>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (plotH - 2));
          const x = i * slot + slot * 0.18;
          const y = plotH - h;
          const bitten = bite?.i === i;
          return (
            <rect
              key={i}
              className="bar-rect"
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={Math.min(2.5, barW / 3)}
              mask={bitten ? `url(#bm${mid})` : undefined}
              style={{ fill: `url(#bg${gid})`, opacity: 0.92 }}
            >
              <title>{`${d.label}: ${format ? format(d.value) : d.value}`}</title>
            </rect>
          );
        })}
        {/* exact value printed beside the bitten element (AM-3) */}
        {bite && (
          <text
            className="bite-tag"
            x={Math.min(Math.max(bite.cx, 34), w - 34)}
            y={Math.max(bite.top - geo.r - 6, 10)}
            textAnchor="middle"
          >
            {`${bite.label} · ${format ? format(bite.value) : bite.value}`}
          </text>
        )}
        <line x1="0" y1={plotH + 0.5} x2={w} y2={plotH + 0.5} style={{ stroke: "var(--line)", strokeWidth: 1 }} />
      </svg>
      <div className="chartaxis">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function Sparkline({ points, height = 46, color = "var(--ember)" }: { points: number[]; height?: number; color?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (points.length < 2 || w < 20) return <div ref={ref} style={{ height, display: "block" }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pts = points.map((p, i) => [(i / (points.length - 1)) * w, height - 4 - ((p - min) / span) * (height - 8)] as const);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${path} L${w},${height} L0,${height} Z`;
  return (
    <div ref={ref}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: "block" }} aria-hidden="true">
        <defs>
          <linearGradient id={`sg${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.14 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={area} style={{ fill: `url(#sg${gid})` }} />
        <path d={path} style={{ fill: "none", stroke: color }} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Horizontal bar meters. When there are ≥2 rows the SECOND row's exposed
 * TRACK carries the bite (never the fill endpoint; ≤8px depth, meter rule);
 * the exact value is already printed beside every row.
 */
export function HBarList({
  data,
  color = "var(--ember)",
  format,
}: {
  data: { label: string; value: number; sub?: string }[];
  color?: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const biteIdx = data.length >= 2 ? 1 : -1;
  const bitePct = biteIdx >= 0 ? (data[biteIdx].value / max) * 100 : 0;
  const biteX = Math.min(bitePct + 14, 92); // inside exposed track, away from the fill end
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => {
        const fillPct = (d.value / max) * 100;
        const bitten = i === biteIdx;
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={d.label}>{d.sub ?? d.label}</span>
              <span className="data" style={{ color: "var(--ink-dim)" }}>{format ? format(d.value) : d.value}</span>
            </div>
            <div
              style={{
                height: 7,
                background: "var(--surface-sunken)",
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
                // meter bite: ≤8px deep notch in the exposed track
                ...(bitten
                  ? {
                      WebkitMaskImage: `radial-gradient(circle 7px at ${biteX}% 50%, transparent 6.5px, #000 7px)`,
                      maskImage: `radial-gradient(circle 7px at ${biteX}% 50%, transparent 6.5px, #000 7px)`,
                    }
                  : {}),
              }}
            >
              <div style={{ height: 7, width: `${fillPct}%`, background: color, borderRadius: 4, opacity: 0.92 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The Bite ring — hero meter. Bite is cut from the ring body
 * (the track), offset ≥45° from the fill endpoint so the notch never
 * touches the current value; exact value printed beside (AM-3).
 */
export function BiteRing({
  percent,
  size = 148,
  big,
  unit,
  label,
  sub,
}: {
  percent: number;
  size?: number;
  big: string;
  unit?: string;
  label: string;
  sub?: string;
}) {
  const mid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const p = Math.max(0, Math.min(100, percent));
  const stroke = 13;
  const c = size / 2;
  const r = (size - stroke) / 2 - 2;
  // bite size: ~11% of ring bbox chord, capped so the cut depth on the outer
  // edge stays ≤ 8px (meter rule)
  const br = Math.min(size * 0.07, stroke / 2 + 4.5);
  // the bite circle must cross the FULL band (outer edge to inner edge) or a
  // sliver of ring shows through the notch — anchor it just past the inner edge.
  const centerRad = r - stroke / 2 + br - 1;
  // place the notch inside the exposed TRACK (AM-3: bite the track, never
  // the fill endpoint/current value) — centered when the track allows,
  // else ≥18° past the fill end; never wrapping across the 0° seam.
  const endAngle = (p / 100) * 360;
  const trackDeg = (100 - p) * 3.6;
  const biteAngle = endAngle + Math.max(trackDeg / 2, 18);
  const rad = ((biteAngle - 90) * Math.PI) / 180;
  const bcx = c + Math.cos(rad) * centerRad;
  const bcy = c + Math.sin(rad) * centerRad;
  return (
    <div className="bitering">
      <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${big}${unit ?? ""}`} style={{ overflow: "visible" }}>
        <defs>
          <mask id={`ringbite${mid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={size} height={size}>
            <rect x="0" y="0" width={size} height={size} fill="#fff" />
            {/* ONE clean bite (AM-3: one notch max) crossing the full band */}
            <circle cx={bcx} cy={bcy} r={br} fill="#000" />
          </mask>
        </defs>
        <g mask={`url(#ringbite${mid})`}>
          {/* the cookie: ink ring (chocolate on vanilla / cream glaze on
              cocoa) — ember is reserved for the LIVE pulse, so the Bite
              signature itself is a literal bitten cookie */}
          <circle cx={c} cy={c} r={r} fill="none" style={{ stroke: "var(--line-ctl)" }} strokeWidth={stroke} />
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            pathLength={100}
            strokeDasharray={`${p} ${100 - p}`}
            transform={`rotate(-90 ${c} ${c})`}
            style={{ stroke: "var(--ink)" }}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div className="bitemeta">
        <span className="lbl">{label}</span>
        <span className="big">
          {big}
          {unit && <span className="unit"> {unit}</span>}
        </span>
        {sub && <span className="sub">{sub}</span>}
      </div>
    </div>
  );
}

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
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

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
          {/* halftone overlay: paper-colored dots over the bars (v4 texture) */}
          <pattern id={`ht${gid}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="0.9" style={{ fill: "var(--surface-raised)" }} opacity="0.5" />
          </pattern>
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
            <g key={i}>
              <rect
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
              {/* halftone punch (decorative, never intercepts hover) */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={Math.min(2.5, barW / 3)}
                fill={`url(#ht${gid})`}
                pointerEvents="none"
                mask={bitten ? `url(#bm${mid})` : undefined}
              />
            </g>
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

export function Sparkline({
  points,
  height = 46,
  color = "var(--ink)",
  dotColor = "var(--ember)",
}: {
  points: number[];
  height?: number;
  color?: string;
  dotColor?: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (points.length < 2 || w < 20) return <div ref={ref} style={{ height, display: "block" }} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pts = points.map((p, i) => [(i / (points.length - 1)) * w, height - 4 - ((p - min) / span) * (height - 8)] as const);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${path} L${w},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <div ref={ref}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: "block" }} aria-hidden="true">
        <defs>
          {/* halftone dot matrix under the line (v4 texture mandate) */}
          <pattern id={`hd${gid}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="1.05" style={{ fill: "var(--halftone)" }} />
          </pattern>
        </defs>
        <path d={area} fill={`url(#hd${gid})`} opacity={0.55} />
        <path d={path} style={{ fill: "none", stroke: color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* the pulse: ember end-dot marks NOW */}
        <circle cx={last[0] - 2} cy={last[1]} r="3.6" style={{ fill: dotColor }} />
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
 * The Bite ring — hero meter AND the poster's graphic centerpiece
 * (reference-approved.png). Ember ring with ONE bite cut from the
 * track (offset ≥45° from the fill endpoint so the notch never
 * touches the current value); the exact value prints in the ring
 * center (AM-3). layout="stacked" = reference composition: big ring,
 * value inside, "exactly N% baked" line below.
 */
export function BiteRing({
  percent,
  size = 148,
  big,
  unit,
  label,
  sub,
  layout = "inline",
  bakeline,
}: {
  percent: number;
  size?: number;
  big: string;
  unit?: string;
  label: string;
  sub?: string;
  /** "inline" = ring + side meta (legacy), "stacked" = reference centerpiece */
  layout?: "inline" | "stacked";
  /** stacked: caps line under the ring, e.g. "EXACTLY 68.4% BAKED" */
  bakeline?: ReactNode;
}) {
  const mid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const p = Math.max(0, Math.min(100, percent));
  const stroke = layout === "stacked" ? Math.round(size * 0.118) : 13;
  const c = size / 2;
  const r = (size - stroke) / 2 - 2;
  // bite size: chord exactly at the AM-3 bound — 14% of plot bbox, ≤8px depth
  const br = size * 0.07;
  // the bite is taken from the cookie's OUTER EDGE (reference: the notch
  // opens outward) and reaches just past the inner edge so no sliver of
  // band shows through the notch.
  const centerRad = r + stroke / 2 - br * 0.18;
  // place the notch inside the exposed TRACK (AM-3: bite the track, never
  // the fill endpoint/current value) — centered when the track allows,
  // else ≥18° past the fill end; never wrapping across the 0° seam.
  // Near-full rings have no usable track: no bite (AM-3 keeps the law).
  const endAngle = (p / 100) * 360;
  const trackDeg = (100 - p) * 3.6;
  const hasTrack = trackDeg >= 26 && p > 2;
  const biteAngle = endAngle + Math.max(trackDeg / 2, 18);
  const rad = ((biteAngle - 90) * Math.PI) / 180;
  const bcx = c + Math.cos(rad) * centerRad;
  const bcy = c + Math.sin(rad) * centerRad;
  const centerFont = Math.round(size * 0.2);
  const capFont = Math.max(9, Math.round(size * 0.045));

  const ringSvg = (
    <svg
      className="ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${label}: ${big}${unit ?? ""}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        <mask id={`ringbite${mid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={size} height={size}>
          <rect x="0" y="0" width={size} height={size} fill="#fff" />
          {/* ONE bite (AM-3: a single notch region, total arc ≤40°) with a
              lightly scalloped edge like the reference's cookie bite —
              satellites overlap the main circle so the region stays one
              connected shape. No exposed track → no bite (AM-3). */}
          {hasTrack && (
            <g fill="#000">
              <circle cx={bcx} cy={bcy} r={br} />
              {[-12, 12].map((a) => {
                const srad = ((biteAngle + a - 90) * Math.PI) / 180;
                const sx = c + Math.cos(srad) * centerRad;
                const sy = c + Math.sin(srad) * centerRad;
                return <circle key={a} cx={sx} cy={sy} r={br * 0.55} />;
              })}
            </g>
          )}
        </mask>
      </defs>
      <g mask={`url(#ringbite${mid})`}>
        {/* clean center: paper disc under the value so backdrop halftone
            never fights the center label (reference keeps a clean hollow) */}
        <circle cx={c} cy={c} r={Math.max(0, r - stroke / 2 + 1)} style={{ fill: "var(--surface)" }} />
        {/* track: warm wash of the ember (reference: beige remainder) */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          style={{ stroke: "var(--ring-track)" }}
          strokeWidth={stroke}
        />
        {/* the fill: EMBER — per the approved reference, the donut is the
            loud accent (accent-live semantics: epoch progress is live state) */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          pathLength={100}
          strokeDasharray={`${p} ${100 - p}`}
          transform={`rotate(-90 ${c} ${c})`}
          style={{ stroke: "var(--ember)" }}
          strokeWidth={stroke}
        />
      </g>
      {layout === "stacked" && (
        <g>
          <text
            x={c}
            y={c + centerFont * 0.18}
            textAnchor="middle"
            className="bite-center-big"
            fontSize={centerFont}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {`${big}${unit ?? ""}`}
          </text>
          <text
            x={c}
            y={c + centerFont * 0.72}
            textAnchor="middle"
            className="bite-center-cap"
            fontSize={capFont}
          >
            {label.toUpperCase()}
          </text>
        </g>
      )}
    </svg>
  );

  if (layout === "stacked") {
    return (
      <div className="bitering stacked">
        {ringSvg}
        {(bakeline || sub) && (
          <div className="bitemeta">
            {bakeline && <span className="bakeline">{bakeline}</span>}
            {sub && <span className="bakesub">{sub}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bitering">
      {ringSvg}
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

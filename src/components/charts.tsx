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

/* ------------------------------------------------------------------
   v6.2 COOKIE TEXTURE KIT (CEO order 2026-09-13: "actual cookie
   crumbles… crackling cookie texture"). Hand-rolled SVG only, zero
   deps, fully STATIC — nothing animates, so prefers-reduced-motion
   is irrelevant to these layers (they compose with grain+halftone).
   Determinism law: every crumb and crackle stroke comes from one
   seeded mulberry32 PRNG with a FIXED seed — placement never
   re-rolls between renders, themes, or captures.
------------------------------------------------------------------- */

/** mulberry32 — tiny deterministic seeded PRNG (no deps). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Crumb {
  x: number;
  y: number;
  /** 2.6–5.5 viewBox units → ~2–4.5px at the hero ring's rendered scale */
  s: number;
  rot: number;
  kind: "angular" | "round"; // a mix — crumbs are not uniform circles
  tone: 0 | 1 | 2; // dough / amber / ink tint (classes carry theme tokens)
  points?: string;
  rx?: number;
  ry?: number;
}

/**
 * CRUMB CLUSTER AT THE BITE — the bitten cookie sheds. Particles sit
 * in/around the notch mouth with gravity sag (crumbs fall, they don't
 * orbit), clinging to the dough track just past the wound. Hard laws,
 * enforced per particle:
 *  - never on the ember fill (the live arc is the datum, not a surface)
 *  - never inside the center-label keep-out (d ≥ 118 from ring center)
 *  - never outside the viewBox (crumbs may not spill onto neighboring
 *    text — the bakeline below, the price column left)
 *  - no cluster without a bite (hasTrack gates the caller)
 */
function crumbsAtBite(
  size: number,
  bcx: number,
  bcy: number,
  fillEndAngle: number,
  rOuter: number,
): Crumb[] {
  const rnd = mulberry32(0xc0fee); // fixed seed — placement never re-rolls
  const c = size / 2;
  const crumbs: Crumb[] = [];
  for (let i = 0; i < 9; i++) {
    // shed cloud around the notch mouth: mostly falling, a couple kicked
    // up; dx biased inward — the notch rides the viewBox edge on live data
    const dx = (rnd() - 0.38) * 42;
    const dy = (rnd() < 0.82 ? 1 : -0.45) * (4 + rnd() * 30);
    const x = bcx + dx;
    const y = bcy + dy;
    // keep-out checks — discard (deterministically) rather than nudge
    const vx = x - c;
    const vy = y - c;
    const d = Math.hypot(vx, vy);
    if (d < 118) continue; // center label zone
    if (x < 7 || x > size - 7 || y < 7 || y > size - 7) continue; // viewBox
    const ang = ((Math.atan2(vy, vx) * 180) / Math.PI + 90 + 360) % 360; // from top
    const onBand = d > rOuter - 50 && d < rOuter + 3;
    const onFill = onBand && ang <= fillEndAngle + 2;
    if (onFill) continue;
    const s = 2.6 + rnd() * 2.9;
    const kind: Crumb["kind"] = i % 3 === 1 ? "round" : "angular";
    const crumb: Crumb = {
      x,
      y,
      s,
      rot: Math.round(rnd() * 360),
      kind,
      tone: (i % 3) as 0 | 1 | 2,
    };
    if (kind === "angular") {
      // 6-vertex irregular blob — an angular crumb, not a circle
      const pts: string[] = [];
      for (let v = 0; v < 6; v++) {
        const va = (v / 6) * Math.PI * 2 + rnd() * 0.55;
        const vr = s * (0.62 + rnd() * 0.38);
        pts.push(`${(Math.cos(va) * vr).toFixed(1)},${(Math.sin(va) * vr).toFixed(1)}`);
      }
      crumb.points = pts.join(" ");
    } else {
      crumb.rx = +(s * (0.75 + rnd() * 0.3)).toFixed(1);
      crumb.ry = +(s * (0.58 + rnd() * 0.3)).toFixed(1);
    }
    crumbs.push(crumb);
  }
  return crumbs;
}

/**
 * CRACKLE SURFACE — thin irregular shortbread/gingerbread crack lines
 * on the ring's exposed dough track (the fill paints AFTER, so any
 * stroke drifting toward the live arc is covered — the datum stays
 * clean). 4–10 short branching strokes (6–10 at the live track size),
 * organic (wobbled tangents, one offshoot each), 1px via
 * non-scaling-stroke so they read as hairline crackle at every ring
 * size, both themes.
 */
function crackleOnTrack(
  size: number,
  r: number,
  stroke: number,
  endAngle: number,
  trackDeg: number,
): string[] {
  const rnd = mulberry32(0x5b0a7); // "shortbread" — fixed seed
  const c = size / 2;
  // arc window: inset from the fill endpoint and the 0° seam
  const insetA = Math.min(10, trackDeg * 0.2);
  const insetB = Math.min(6, trackDeg * 0.15);
  const a0 = endAngle + insetA;
  const span = Math.max(6, trackDeg - insetA - insetB);
  const n = Math.max(4, Math.min(10, Math.round(span / 16)));
  const cracks: string[] = [];
  const at = (deg: number, rad2: number) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [c + Math.cos(t) * rad2, c + Math.sin(t) * rad2] as const;
  };
  for (let i = 0; i < n; i++) {
    const deg = a0 + (n === 1 ? span / 2 : (i / (n - 1)) * span) + (rnd() - 0.5) * (span / n) * 0.9;
    const rr = r + (rnd() - 0.5) * (stroke - 12); // inside the band, off its edges
    const [sx, sy] = at(deg, rr);
    // crack direction: roughly tangent to the arc, either way, then wobbles
    let dir = ((deg - 90) * Math.PI) / 180 + Math.PI / 2 + (rnd() < 0.5 ? 0 : Math.PI);
    const len = 9 + rnd() * 13;
    const segs = 3;
    let px = sx;
    let py = sy;
    let bx = 0;
    let by = 0;
    const parts = [`M${px.toFixed(1)} ${py.toFixed(1)}`];
    for (let v = 0; v < segs; v++) {
      dir += (rnd() - 0.5) * 0.9; // organic wobble — never a straight rule
      const step = len / segs;
      px += Math.cos(dir) * step;
      py += Math.sin(dir) * step;
      if (v === 1) {
        bx = px;
        by = py; // branch grows off the middle joint
      }
      parts.push(`L${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    // one short offshoot
    const bdir = dir + (rnd() < 0.5 ? 1 : -1) * (0.7 + rnd() * 0.6);
    const blen = 4 + rnd() * 4;
    parts.push(
      `M${bx.toFixed(1)} ${by.toFixed(1)}`,
      `L${(bx + Math.cos(bdir) * blen).toFixed(1)} ${(by + Math.sin(bdir) * blen).toFixed(1)}`,
    );
    cracks.push(parts.join(""));
  }
  return cracks;
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
  // v6 honesty floor: the tallest bar carries a printed value (top-N note
  // joins the axis row below); the bite tag already covers its own bar.
  const topIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

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
        {/* v6: value label on the top bar (skipped when the bite tag covers it) */}
        {bite?.i !== topIdx && (
          <text
            className="bite-tag"
            x={Math.min(Math.max(topIdx * slot + slot / 2, 34), w - 34)}
            y={Math.max(plotH - Math.max(2, (data[topIdx].value / max) * (plotH - 2)) - 6, 10)}
            textAnchor="middle"
          >
            {format ? format(data[topIdx].value) : data[topIdx].value}
          </text>
        )}
        <line x1="0" y1={plotH + 0.5} x2={w} y2={plotH + 0.5} style={{ stroke: "var(--line)", strokeWidth: 1 }} />
      </svg>
      <div className="chartaxis">
        <span>{data[0]?.label}</span>
        <span className="axisnote">{data.length} bars · top labeled</span>
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
  unit,
  format,
}: {
  points: number[];
  height?: number;
  color?: string;
  dotColor?: string;
  /** v6 honesty floor: unit printed on the min/max/now labels */
  unit?: string;
  format?: (n: number) => string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (points.length < 2 || w < 20) return <div ref={ref} style={{ height, display: "block" }} />;
  const fmt = format ?? ((n: number) => String(n));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  // v6 honesty floor: label gutters — max label above, min label under the baseline
  const padT = 13;
  const padB = 14;
  const baseY = height - padB;
  const pts = points.map((p, i) => [(i / (points.length - 1)) * w, baseY - ((p - min) / span) * (baseY - padT)] as const);
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${path} L${w},${baseY} L0,${baseY} Z`;
  const last = pts[pts.length - 1];
  return (
    <div ref={ref}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        style={{ display: "block" }}
        role="img"
        aria-label={`series in ${unit ?? "units"}: min ${fmt(min)}, max ${fmt(max)}, now ${fmt(points[points.length - 1])}`}
      >
        <defs>
          {/* halftone dot matrix under the line (v4 texture mandate) */}
          <pattern id={`hd${gid}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="1.05" style={{ fill: "var(--halftone)" }} />
          </pattern>
        </defs>
        <path d={area} fill={`url(#hd${gid})`} opacity={0.55} />
        {/* labeled baseline (honesty floor): the floor of the plot, always ruled */}
        <line x1="0" y1={baseY + 0.5} x2={w} y2={baseY + 0.5} style={{ stroke: "var(--line-ctl)", strokeWidth: 1 }} />
        <path d={path} style={{ fill: "none", stroke: color }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* the pulse: ember end-dot marks the current value; NOW label parks top-right (v6.1) */}
        <circle cx={last[0] - 2} cy={last[1]} r="3.6" style={{ fill: dotColor }} />
        <text className="spark-lab" x={w - 1} y={padT - 4} textAnchor="end">
          NOW <tspan className="spark-val">{fmt(points[points.length - 1])}{unit ? ` ${unit}` : ""}</tspan>
        </text>
        <text className="spark-lab" x="1" y={padT - 4}>
          MAX <tspan className="spark-val">{fmt(max)}{unit ? ` ${unit}` : ""}</tspan>
        </text>
        <text className="spark-lab" x="1" y={height - 3}>
          MIN <tspan className="spark-val">{fmt(min)}{unit ? ` ${unit}` : ""}</tspan>
        </text>
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
 * value inside, plain metric label + segment legend below (v6: the
 * ring states what its segments ARE, with amounts).
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
  segments,
}: {
  percent: number;
  size?: number;
  big: string;
  unit?: string;
  label: string;
  sub?: string;
  /** "inline" = ring + side meta (legacy), "stacked" = reference centerpiece */
  layout?: "inline" | "stacked";
  /** stacked: plain caps line under the ring (the metric label, no wordplay) */
  bakeline?: ReactNode;
  /** stacked: per-segment labels with amounts (v6 honesty floor) */
  segments?: { label: string; value: string; pct: number; color?: string }[];
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
  // v6.2 cookie texture (stacked centerpiece only — restraint law):
  // crumbs at the bite + crackle on the dough track. Seeded, static.
  const rOuter = r + stroke / 2;
  const crumbs =
    layout === "stacked" && hasTrack ? crumbsAtBite(size, bcx, bcy, endAngle, rOuter) : [];
  const cracks =
    layout === "stacked" && hasTrack ? crackleOnTrack(size, r, stroke, endAngle, trackDeg) : [];

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
        {/* v6.2 CRACKLE — shortbread crack lines on the dough track,
            UNDER the fill paint order: any stroke wandering toward the
            live arc is covered, so the datum always reads clean */}
        {cracks.length > 0 && (
          <g className="crackle" aria-hidden="true">
            {cracks.map((d, i) => (
              <path key={i} d={d} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        )}
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
      {/* v6.2 CRUMBS — the bitten cookie sheds at the notch. Unmasked
          (shed material floats free of the cookie), decorative only. */}
      {crumbs.length > 0 && (
        <g className="crumbs" aria-hidden="true">
          {crumbs.map((cr, i) =>
            cr.kind === "angular" ? (
              <polygon
                key={i}
                className={`crumb tone-${cr.tone}`}
                points={cr.points}
                transform={`translate(${cr.x.toFixed(1)} ${cr.y.toFixed(1)}) rotate(${cr.rot})`}
              />
            ) : (
              <ellipse
                key={i}
                className={`crumb tone-${cr.tone}`}
                rx={cr.rx}
                ry={cr.ry}
                transform={`translate(${cr.x.toFixed(1)} ${cr.y.toFixed(1)}) rotate(${cr.rot})`}
              />
            ),
          )}
        </g>
      )}
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
        {/* v6 honesty floor: segment labels with amounts — direct-labeled,
            color never the only channel (swatch + text + share) */}
        {segments && segments.length > 0 && (
          <div className="ringlegend">
            {segments.map((s) => (
              <span key={s.label} className="rl-row">
                <i className="rl-swatch" style={{ background: s.color ?? "var(--ember)" }} aria-hidden="true" />
                <span className="rl-label">{s.label}</span>
                <b className="rl-val data">{s.value}</b>
                <span className="rl-pct data">{s.pct.toFixed(1)}%</span>
              </span>
            ))}
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

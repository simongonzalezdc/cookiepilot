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

/** ray-cast point-in-polygon — used for the exact wound keep-out. */
function pointInPoly(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
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
  minDist = 118,
  woundPoly?: [number, number][],
  bandInner = 0,
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
    if (d < Math.max(118, minDist)) continue; // center label + ring hollow
    if (x < 7 || x > size - 7 || y < 7 || y > size - 7) continue; // viewBox
    const ang = ((Math.atan2(vy, vx) * 180) / Math.PI + 90 + 360) % 360; // from top
    const onBand = d > rOuter - 50 && d < rOuter + 3;
    const onFill = onBand && ang <= fillEndAngle + 2;
    if (onFill) continue;
    // v6.4 cavity keep-out (exact): no crumb may DEEP-float inside the
    // removed crescent; crumbs at the outer rim of the mouth stay — that
    // is material actively shedding off the wound edge
    if (woundPoly && pointInPoly(x, y, woundPoly) && d < rOuter - (rOuter - bandInner) * 0.55) continue;
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
  biteStart: number,
  biteEnd: number,
): string[] {
  const rnd = mulberry32(0x5b0a7); // "shortbread" — fixed seed
  const c = size / 2;
  // arc window: inset from the fill endpoint and the 0° seam, minus the
  // bite mouth (crackle belongs to the dough that survived the bite)
  const insetA = Math.min(10, trackDeg * 0.2);
  const insetB = Math.min(6, trackDeg * 0.15);
  const a0 = endAngle + insetA;
  const a1 = a0 + Math.max(6, trackDeg - insetA - insetB);
  const w1 = Math.max(0, biteStart - 3 - a0);
  const w2 = Math.max(0, a1 - (biteEnd + 3));
  const L = w1 + w2;
  const n = Math.max(4, Math.min(10, Math.round(L / 16)));
  const cracks: string[] = [];
  const at = (deg: number, rad2: number) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [c + Math.cos(t) * rad2, c + Math.sin(t) * rad2] as const;
  };
  for (let i = 0; i < n; i++) {
    // position along the combined allowed track (before / after the bite)
    const t = Math.min(L, Math.max(0, (n === 1 ? L / 2 : (i / (n - 1)) * L) + (rnd() - 0.5) * (L / n) * 0.9));
    const deg = t <= w1 ? a0 + t : biteEnd + 3 + (t - w1);
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
/* ------------------------------------------------------------------
   v6.4 STUFFING (CEO visual-identity pass 4: the thick band gets
   cookie stuffing — half-sunk chocolate chips + sugar speckle; the
   mottle filter lives with the ring's defs below). Hand-rolled SVG,
   zero deps, fully STATIC, seeded (determinism law: placement never
   re-rolls across renders, themes, or captures). Keep-outs enforced
   per mark:
   - angular: only on the exposed dough track, ≥10° clear of the fill
     endpoint (the datum), clear of the 0° seam, ≥6° off the bite
     wound edge (the mask would cut anything inside the mouth anyway)
   - radial: chips fully inside the band, off both edges; sugar speckle
     AT the edges by design (crystals catch light on the rim)
   - never inside the center-label keep-out (the band is far outside)
   Restraint: reads as chocolate-chip cookie at a glance, not a photo.
------------------------------------------------------------------- */

interface ChipMark {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  points: string;
}

interface Speck {
  x: number;
  y: number;
  r: number;
  o: number;
}

function stuffingOnBand(
  size: number,
  r: number,
  stroke: number,
  endAngle: number,
  trackDeg: number,
  biteStart: number,
  biteEnd: number,
): { chips: ChipMark[]; specks: Speck[] } {
  const rnd = mulberry32(0x3ac0c0); // "choc chip" — fixed seed
  const c = size / 2;
  // allowed angular windows: the surviving dough track, inset from the
  // fill endpoint (≥10°, the datum keep-out) and the 0° seam, minus the
  // bite mouth ±6° margin (the wound edge keep-out)
  const insetA = Math.min(10, trackDeg * 0.28);
  const insetB = Math.min(8, trackDeg * 0.2);
  const a0 = endAngle + insetA;
  const a1 = endAngle + trackDeg - insetB;
  const w1 = Math.max(0, biteStart - 10 - a0);
  const w2 = Math.max(0, a1 - (biteEnd + 10));
  const L = w1 + w2;
  const at = (deg: number, rad2: number) => {
    const t = ((deg - 90) * Math.PI) / 180;
    return [c + Math.cos(t) * rad2, c + Math.sin(t) * rad2] as const;
  };
  const degAt = (t: number) => (t <= w1 ? a0 + t : biteEnd + 10 + (t - w1));
  const chips: ChipMark[] = [];
  // 6–10 chips: 14 seeded candidates, keep-outs + spacing discard
  for (let i = 0; i < 14 && chips.length < 9; i++) {
    const t = rnd() * L;
    const deg = degAt(t);
    const rr = r + (rnd() - 0.5) * (stroke - 26); // inside the band, off its edges
    const [x, y] = at(deg, rr);
    const rx = 7 + rnd() * 4; // 7–11 viewBox units (≈7–11px at hero scale)
    const ry = rx * (0.72 + rnd() * 0.2);
    const reach = Math.max(rx, ry);
    // radial keep-out: chip fully inside the band
    if (rr + reach > r + stroke / 2 - 1.5 || rr - reach < r - stroke / 2 + 1.5) continue;
    // spacing: no chip piles — ≥15 units center-to-center
    if (chips.some((p) => Math.hypot(p.x - x, p.y - y) < 15)) continue;
    // irregular blob: 9 vertices with radius jitter — never a clean ellipse
    const pts: string[] = [];
    const ph0 = rnd() * Math.PI * 2;
    for (let v = 0; v < 9; v++) {
      const va = ph0 + (v / 9) * Math.PI * 2;
      const vr = rx * (0.8 + rnd() * 0.28);
      pts.push(`${(Math.cos(va) * vr).toFixed(1)},${(Math.sin(va) * vr * (ry / rx)).toFixed(1)}`);
    }
    chips.push({
      x: +x.toFixed(1),
      y: +y.toFixed(1),
      rx: +rx.toFixed(1),
      ry: +ry.toFixed(1),
      rot: Math.round(rnd() * 360),
      points: pts.join(" "),
    });
  }
  // sugar speckle: tiny crystals catching light at the band edges
  const specks: Speck[] = [];
  for (let i = 0; i < 30 && specks.length < 22; i++) {
    const deg = degAt(rnd() * L);
    const edge = rnd() < 0.5 ? -1 : 1;
    const rr = r + edge * (stroke / 2 - (2 + rnd() * 3.5));
    const [x, y] = at(deg, rr);
    specks.push({ x: +x.toFixed(1), y: +y.toFixed(1), r: +(0.7 + rnd() * 0.9).toFixed(1), o: 0.4 + rnd() * 0.35 });
  }
  return { chips, specks };
}

/* ------------------------------------------------------------------
   v6.3 REAL BITE (CEO directive 2026-09-13: "the bite doesn't look
   like a real bite" — the scalloped circle notch read as gear teeth).
   A human bite from a round cookie is a CRESCENT removal anchored on
   the outer edge: the mouth interrupts the rim, and the wound's inner
   edge is a DOUBLE DENTAL-ARC — a wide shallow upper-incisor arc and
   a narrower deeper lower-incisor arc crossing at TWO CUSP POINTS
   (where the deeper one switches). Each arc carries 4–6 subtle tooth
   bumps (individual incisor impressions). Everything is seeded
   (mulberry32) and deliberately asymmetric; crescent depth at center
   lands in the 18–26%-of-ring-radius band (AM-3 v6.3). One bite only;
   centered in the exposed track so it never touches the fill endpoint
   (current value) or the 0° seam, and its deepest radius (~145 at the
   hero size) stays outside the center-label keep-out.
------------------------------------------------------------------- */

interface RealBite {
  /** mask path for the removal (black region, wound edge + rim arc) */
  d: string;
  /** wound mouth center — the crumb-shed anchor */
  cx: number;
  cy: number;
  /** wound-edge polygon (absolute coords, closed) — exact keep-out */
  woundPoly: [number, number][];
}

/** 4–6 seeded incisor impressions along one dental arc (relative to its peak). */
function dentalBumps(rnd: () => number, spanUnits: number) {
  const n = 4 + Math.floor(rnd() * 3);
  const list: { c: number; a: number; s: number }[] = [];
  const span = spanUnits * 1.5;
  for (let k = 0; k < n; k++) {
    list.push({
      c: -span / 2 + (n === 1 ? span / 2 : (k / (n - 1)) * span) + (rnd() - 0.5) * (span / n) * 0.6,
      a: 1.1 + rnd() * 1.7, // subtle — ≈0.7–1.7% of ring radius each
      s: spanUnits * (0.11 + rnd() * 0.08),
    });
  }
  return list;
}

function realBiteGeometry(
  c: number, // ring center (viewBox coords)
  rOut: number, // rim radius (outer edge the mouth opens into)
  r: number, // ring mid radius — the depth band is a % of this
  biteAngle: number, // mouth center, degrees clockwise from top
  fitHalf: number, // max half-angle the exposed track allows
  seed: number,
): RealBite {
  const rnd = mulberry32(seed);
  // LOCKED v6.3 tasteroll winner (org-bridge minimax, 2026-09-13):
  // mouth half-angle 26–29°, crescent depth 18–20% of ring radius.
  // v6.4 thick-band re-validation: constants UNCHANGED — the ±10% tweak
  // (deeper/wider) collapsed the wound edge to one clean concave arc
  // (vision 4/10 FAKE, the v6.3 failure mode); the locked geometry held
  // REAL 6/10 on the 0.17 band, so it stands as-is.
  const mouthHalf = Math.min(26 + rnd() * 3, Math.max(24, fitHalf)); // 52–58° mouth
  const depth = r * (0.18 + rnd() * 0.02); // crescent depth at center, 18–20% of ring radius
  // upper incisor row: wide + shallow; lower: narrower + deeper. Peaks
  // offset oppositely → the two arcs cross at two cusp points flanking
  // the crescent center (a bite is never symmetric).
  const up = {
    d: depth * (0.55 + rnd() * 0.16),
    w: mouthHalf * (0.94 + rnd() * 0.08),
    o: (rnd() - 0.5) * mouthHalf * 0.3,
    bumps: dentalBumps(rnd, mouthHalf * 0.66),
  };
  const lo = {
    d: depth * (0.94 + rnd() * 0.06),
    w: mouthHalf * (0.52 + rnd() * 0.16),
    o: (rnd() - 0.5) * mouthHalf * 0.5 - up.o, // opposite-side bias, seeded
    bumps: dentalBumps(rnd, mouthHalf * 0.4),
  };
  const arcDepth = (phi: number, arc: typeof up) => {
    const e = 1 - ((phi - arc.o) / arc.w) ** 2;
    if (e <= 0) return 0;
    const root = Math.sqrt(e);
    let d = arc.d * root;
    for (const b of arc.bumps) {
      const g = Math.exp(-(((phi - arc.o - b.c) / b.s) ** 2));
      d += b.a * g * Math.min(1, root * 1.6); // impressions fade at the row ends
    }
    return d;
  };
  // wound edge: the deeper of the two dental arcs at every angle
  const steps = 44;
  const pts: string[] = [];
  const poly: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const phi = -mouthHalf + (i / steps) * mouthHalf * 2;
    const d = Math.max(arcDepth(phi, up), arcDepth(phi, lo));
    const rad = ((biteAngle + phi - 90) * Math.PI) / 180;
    const R = rOut - d;
    const x = c + Math.cos(rad) * R;
    const y = c + Math.sin(rad) * R;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    poly.push([x, y]);
  }
  const rimPt = (phi: number) => {
    const rad = ((biteAngle + phi - 90) * Math.PI) / 180;
    return `${(c + Math.cos(rad) * rOut).toFixed(1)} ${(c + Math.sin(rad) * rOut).toFixed(1)}`;
  };
  const PL = rimPt(-mouthHalf);
  const PR = rimPt(mouthHalf);
  const d = `M${PL} L${pts.join(" L")} L${PR} A${rOut.toFixed(1)} ${rOut.toFixed(1)} 0 0 0 ${PL} Z`;
  const rad0 = ((biteAngle - 90) * Math.PI) / 180;
  const shedR = rOut - depth * 0.5;
  // wound polygon closes along the outer rim (the removed crescent)
  for (let i = 0; i <= 24; i++) {
    const phi = mouthHalf - (i / 24) * mouthHalf * 2;
    const rad = ((biteAngle + phi - 90) * Math.PI) / 180;
    poly.push([c + Math.cos(rad) * rOut, c + Math.sin(rad) * rOut]);
  }
  return { d, cx: c + Math.cos(rad0) * shedR, cy: c + Math.sin(rad0) * shedR, woundPoly: poly };
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
  // v6.4 THICK BAND (CEO visual-identity pass 4: chunky-cookie read):
  // band width 0.17 × ring size (was 0.118 — the thin band read as a
  // gauge track, not a cookie rim). Bite constants re-validated on the
  // thick canvas via the org-bridge vision seat; seed unchanged.
  const stroke = layout === "stacked" ? Math.round(size * 0.17) : 13;
  const c = size / 2;
  const r = (size - stroke) / 2 - 2;
  // v6.3 REAL BITE: the notch is a human-bite crescent (see
  // realBiteGeometry) — mouth opening on the OUTER EDGE, crescent depth
  // 18–26% of ring radius at center, double dental-arc wound edge.
  // It sits centered in the exposed TRACK (AM-3: never the fill
  // endpoint/current value, never across the 0° seam) with ≥10° clear
  // on both sides; no usable track → no bite (AM-3 keeps the law).
  const endAngle = (p / 100) * 360;
  const trackDeg = (100 - p) * 3.6;
  const fitHalf = trackDeg / 2 - 10;
  const hasTrack = fitHalf >= 24 && p > 2 && p < 98;
  const biteAngle = endAngle + trackDeg / 2;
  const rOuter = r + stroke / 2;
  // v6.3 tasteroll (2026-09-13): three seeded candidates vision-checked via
  // the org bridge (minimax) — v2 (deep/wide mouth) FAILED ("one clean
  // concave arc", 3/10); v1 vs v3 head-to-head ×2 (order-swapped) both
  // picked THIS geometry: "more irregular tooth impressions with varied
  // depth". Locked: seed 0xd1bc3, depth 18–20% of r, mouth 26–29° half.
  const bite = hasTrack ? realBiteGeometry(c, rOuter, r, biteAngle, fitHalf, 0xd1bc3) : null;
  const centerFont = Math.round(size * 0.2);
  const capFont = Math.max(9, Math.round(size * 0.045));
  // v6.2 cookie texture (stacked centerpiece only — restraint law):
  // crumbs shed AT the bite + crackle on the dough track. Seeded, static.
  // Crumbs keep out of the ring hollow (they cling to the wound / fall
  // off the rim) — min distance = just inside the dough track.
  const crumbs =
    layout === "stacked" && bite
      ? crumbsAtBite(size, bite.cx, bite.cy, endAngle, rOuter, r - stroke / 2 + 3, bite.woundPoly, r - stroke / 2)
      : [];
  // crackle lives on the exposed track OUTSIDE the bite mouth (the mask
  // would cut any stroke inside it anyway — this keeps the count honest)
  const cracks =
    layout === "stacked" && hasTrack
      ? crackleOnTrack(size, r, stroke, endAngle, trackDeg, biteAngle - 32, biteAngle + 32)
      : [];
  // v6.4 STUFFING — chocolate chips + sugar speckle on the thick band
  // (stacked centerpiece only — restraint law). Seeded, static, and
  // painted UNDER the fill so the datum (live arc) always reads clean.
  const stuffing =
    layout === "stacked" && hasTrack
      ? stuffingOnBand(size, r, stroke, endAngle, trackDeg, biteAngle - 32, biteAngle + 32)
      : { chips: [], specks: [] };

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
          {/* ONE bite (AM-3 v6.3): a single crescent removal — the
              wound-edge path from realBiteGeometry (double dental arc,
              seeded tooth bumps, mouth opening on the outer edge).
              No exposed track → no bite (AM-3 keeps the law). */}
          {bite && <path d={bite.d} fill="#000" />}
        </mask>
        {/* v6.4 DOUGH MOTTLE — multi-octave feTurbulence color-mapped to
            the amber accent, composited IN the band shape (SourceGraphic)
            so the mottle can never leave the dough. Fixed seed = static. */}
        <filter id={`mottle${mid}`} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" seed="53344" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.34 0.34 0.34 0 -0.16" result="ma" />
          <feFlood style={{ floodColor: "var(--ember)" }} result="mc" />
          <feComposite in="mc" in2="ma" operator="in" result="tint" />
          <feComposite in="tint" in2="SourceGraphic" operator="in" />
        </filter>
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
        {/* v6.4 mottle layer: amber dough blotching over the track */}
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: "var(--ring-track)" }}
          filter={`url(#mottle${mid})`}
          opacity="0.5"
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
        {/* v6.4 STUFFING — half-sunk chocolate chips (irregular cocoa
            blobs, tiny top highlight, soft bottom shadow) + sugar speckle
            at the band edges. Painted UNDER the fill: any mark that could
            reach the datum is covered — the live arc reads clean. */}
        {stuffing.chips.length > 0 && (
          <g className="stuffing" aria-hidden="true">
            {stuffing.chips.map((ch, i) => (
              <g key={i} transform={`translate(${ch.x} ${ch.y}) rotate(${ch.rot})`}>
                <ellipse className="choc-shadow" cx="0" cy={ch.ry * 0.6} rx={ch.rx * 1.18} ry={ch.ry * 0.85} />
                <polygon className="choc-chip" points={ch.points} />
                <ellipse className="choc-hilite" cx={-ch.rx * 0.3} cy={-ch.ry * 0.4} rx={ch.rx * 0.34} ry={ch.ry * 0.24} transform="rotate(-24)" />
              </g>
            ))}
            {stuffing.specks.map((sp, i) => (
              <circle key={`s${i}`} className="sugar" cx={sp.x} cy={sp.y} r={sp.r} opacity={sp.o.toFixed(2)} />
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

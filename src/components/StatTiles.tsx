import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { fetchBridgeStats, fetchChainStats, fetchCookPrice, fetchDailyAnalytics, ChainStats, CookPrice, DailyAnalytics, BridgeStats } from "../lib/api";
import { usePoll, type PollState } from "../hooks/usePoll";
import { useWallet } from "../hooks/useWallet";
import { fmtCompact, fmtNum } from "../lib/format";
import { ErrorBox } from "./ui";
import { Sparkline, BiteRing } from "./charts";
import { rpc } from "../lib/rpc";

interface AllStats {
  stats: ChainStats;
  price: CookPrice;
  daily: DailyAnalytics;
  bridge: BridgeStats | null;
  supply: { circulating: number; total: number };
  slotMs: number | null;
  slotP50: number | null;
  slotP95: number | null;
}

/** Retry a flake-prone fetch a few times before yielding null — one dropped
 *  request must not blank the hero number for a whole poll cycle (30s). */
async function soft<T>(p: () => Promise<T>, tries = 3, baseMs = 1200): Promise<T | null> {
  for (let i = 0; i < tries; i++) {
    try {
      return await p();
    } catch {
      if (i < tries - 1) await new Promise((r) => setTimeout(r, baseMs * (i + 1)));
    }
  }
  return null;
}

async function fetchAll(): Promise<AllStats> {
  const [stats, price, daily, bridge, supplyR, perf] = await Promise.all([
    fetchChainStats(),
    fetchCookPrice(),
    fetchDailyAnalytics(),
    soft(() => fetchBridgeStats()),
    rpc<{ value: { circulating: number; total: number } }>("getSupply", [{ excludeNonCirculatingAccountsList: true }]),
    // block time → the finality story, straight from validator perf samples
    soft(() => rpc<{ numSlots: number; samplePeriodSecs: number }[]>("getRecentPerformanceSamples", [30])),
  ]);
  const supply = supplyR ?? (await soft(() => rpc<{ value: { circulating: number; total: number } }>("getSupply", [{ excludeNonCirculatingAccountsList: true }]), 2, 800));
  if (!supply) throw new Error("supply unavailable");
  const perSampleMs = (perf ?? []).filter((s) => s?.numSlots > 0).map((s) => (s.samplePeriodSecs * 1000) / s.numSlots).sort((a, b) => a - b);
  const slotMs = perSampleMs.length ? perSampleMs[perSampleMs.length - 1] : null;
  const slotP50 = perSampleMs.length ? perSampleMs[Math.floor(perSampleMs.length * 0.5)] : null;
  const slotP95 = perSampleMs.length ? perSampleMs[Math.min(perSampleMs.length - 1, Math.floor(perSampleMs.length * 0.95))] : null;
  return {
    stats,
    price,
    daily,
    bridge: bridge ?? null,
    supply: { circulating: supply.value.circulating / 1e9, total: supply.value.total / 1e9 },
    slotMs,
    slotP50,
    slotP95,
  };
}

function fmtSlotTime(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  return ms >= 1000 ? `~${(ms / 1000).toFixed(2)}s` : `~${Math.round(ms)}ms`;
}

/* ------------------------------------------------------------------
   v5: one shared poll feeds the hero AND section 03, so the first
   viewport stays a pure poster while every datum has a home.
------------------------------------------------------------------ */
const StatsCtx = createContext<PollState<AllStats> | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const poll = usePoll<AllStats>(fetchAll, 30_000);
  return <StatsCtx.Provider value={poll}>{children}</StatsCtx.Provider>;
}

/** Finality SLA — rolling window of feed-observed finalize latencies (ms),
 *  fed by ActivityFeed's in-place upgrades via a window event. Honest by
 *  construction: only txs we actually watched finalize count. */
const finalizeSamples: number[] = [];
const traySamples: number[] = [];
if (typeof window !== "undefined") {
  window.addEventListener("cookiepilot:finality-sample", (e) => {
    const ms = (e as CustomEvent<number>).detail;
    if (Number.isFinite(ms) && ms >= 0 && ms < 120_000) {
      finalizeSamples.push(ms);
      if (finalizeSamples.length > 80) finalizeSamples.shift();
    }
  });
  window.addEventListener("cookiepilot:tray-sample", (e) => {
    const ms = (e as CustomEvent<number>).detail;
    if (Number.isFinite(ms) && ms >= 0 && ms < 120_000) {
      traySamples.push(ms);
      if (traySamples.length > 80) traySamples.shift();
    }
  });
}

/** shared-poll hook — exported for the header price chip (no 2nd fetch). */
export function useStats(): PollState<AllStats> {
  const ctx = useContext(StatsCtx);
  if (!ctx) throw new Error("useStats must be used inside <StatsProvider>");
  return ctx;
}

/**
 * Poster fit for the GIANT number: measure the string at 100px and scale
 * it to fill its column exactly — the Swiss way. Caps per breakpoint via
 * --price-cap (150px desktop / 96px mobile), floors at --giant-floor
 * (14px — the 3–4-char block time must survive the 80px 400%-zoom
 * reflow lane), and refits on font-load + container resize so no live
 * value can ever overflow.
 */
function useFitPrice(text: string) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    const col = el?.parentElement;
    if (!el || !col) return;
    let raf = 0;
    const fit = () => {
      const cap = parseFloat(getComputedStyle(el).getPropertyValue("--price-cap")) || 150;
      const floor = parseFloat(getComputedStyle(el).getPropertyValue("--giant-floor")) || 24;
      el.style.fontSize = "100px";
      const w = el.scrollWidth || 1;
      const size = Math.max(floor, Math.min(cap, (col.clientWidth / w) * 100 * 0.99));
      el.style.fontSize = `${size}px`;
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };
    schedule();
    document.fonts?.ready.then(schedule).catch(() => {});
    const ro = new ResizeObserver(schedule);
    ro.observe(col);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text]);
  return ref;
}

/**
 * THE HERO — block-time poster (v6.4 HERO B, CEO-ruled 2026-09-13:
 * "A looks broken"; panel 5/5 converged on B). The giant number is
 * LIVE MS/BLOCK from validator perf samples — a number Cookie Chain
 * is proud of — with the bitten ring still the graphic centerpiece
 * and the KPI matrix on the fold edge (one shared poll). COOK price
 * is demoted to a plain-text chip in the header (exact USD, glyph
 * law, no pill chrome).
 */
export function StatTiles() {
  const { data, error, lastUpdated, refresh } = useStats();
  // stale-guard clock: re-render every 5s so feed silence becomes visible
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);
  const staleSec = lastUpdated ? Math.max(0, (nowTick - lastUpdated) / 1000) : null;
  // hook order is sacred: the fit hook runs on every render, ref or no ref
  const blockMs = data?.slotMs ?? null;
  const blockDigits =
    blockMs != null && Number.isFinite(blockMs) && blockMs > 0 ? String(Math.round(blockMs)) : "—";
  const fitRef = useFitPrice(blockDigits);
  const wallet = useWallet();

  if (error && !data)
    return (
      <div className="hero hero-boot">
        <ErrorBox message={error} onRetry={refresh} />
      </div>
    );
  if (!data)
    return (
      <div className="hero hero-boot">
        <p className="bootcaps">Lighting the oven</p>
        <div className="thinking"><i /><i /><i /> <span style={{ marginLeft: 6 }}>reading chain state</span></div>
      </div>
    );

  const { stats, daily, bridge, supply, slotMs, slotP50, slotP95 } = data;
  const epochPct = stats.epochInfo ? (stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch) * 100 : 0;
  // centerpiece ring: share of circulating supply bridged from Solana —
  // honest AND reference-scale loud; falls back to epoch progress while
  // the bridge indexer warms up
  const bridgedPct = bridge?.totalBridged && supply.circulating > 0
    ? Math.min(100, (bridge.totalBridged / supply.circulating) * 100)
    : null;
  const ringPct = bridgedPct ?? epochPct;
  const nativeAmt = bridgedPct != null && bridge?.totalBridged ? supply.circulating - bridge.totalBridged : null;
  const feesSeries = daily.days.slice(-10).map((d) => d.feesCook);
  const feesFmt = (n: number) => n.toFixed(2);

  return (
    <div className="hero">
      <div className="hero-grid">
        <div className="hero-main">
          {/* reference eyebrow: "01 — NETWORK PULSE ▪" in loud caps */}
          <span className="hero-eyebrow">
            <span className="hero-no" aria-hidden="true">01</span>
            <span className="rule-dash" aria-hidden="true" />
            <span className="eb-text">Network pulse</span>
            <span className="sq" aria-hidden="true" />
          </span>

          {/* the poster's ONE giant display numeral (HERO B): live
              MILLISECONDS PER BLOCK — the sub-second story at poster
              scale, fit-to-column, cap 150px, floor 14px (400%-zoom
              reflow lane). Source note on the caps line below. */}
          <p
            className="giantprice"
            ref={fitRef}
            aria-label={`Block time ${blockMs != null ? `${Math.round(blockMs)}ms` : "unavailable"}`}
          >
            {blockDigits}<span className="gp-unit" aria-hidden="true">ms</span>
          </p>
          <div className="blockmeta">
            <span className="pair">BLOCK TIME · LIVE — VALIDATOR PERF SAMPLES</span>
            {slotP50 != null && slotP95 != null && (
              <span className="pair sub">
                TYP {Math.round(slotP50)}ms · WORST {Math.round(slotP95)}ms · 30-SAMPLE BAND
              </span>
            )}
            {staleSec != null && staleSec > 75 && (
              <span className="pair stale">LAST BLOCK {Math.round(staleSec)}s AGO</span>
            )}
          </div>

          {/* standfirst (v6.4): leads with sub-second finality */}
          <h1 className="valueprop">
            Sub-second finality, oven-fresh blocks. A new block bakes every {fmtSlotTime(slotMs)} and cements in
            three ticks — every transfer traced crumb by crumb to the tray.
          </h1>
        </div>

        {/* THE BITE RING — graphic centerpiece (reference-approved.png).
            AM-3: one scallop notch from the track, value prints in the center.
            v6: plain metric label (wordplay dead) + segment labels with COOK
            amounts — the ring says what its segments ARE. */}
        <aside className="hero-side">
          <span className="bite-corner" aria-hidden="true" />
          <BiteRing
            percent={ringPct}
            size={380}
            layout="stacked"
            big={ringPct.toFixed(1)}
            unit="%"
            label={bridgedPct != null ? "of supply bridged" : "of epoch elapsed"}
            sub={`epoch ${stats.epoch ?? "—"} · ${epochPct.toFixed(1)}% through`}
            bakeline={
              <>
                Bridged from Solana — <b>{ringPct.toFixed(1)}%</b>
              </>
            }
            segments={
              bridgedPct != null && bridge?.totalBridged
                ? [
                    { label: "Bridged (Hyperlane)", value: `${fmtCompact(bridge.totalBridged)} COOK`, pct: bridgedPct, color: "var(--ember)" },
                    { label: "Native", value: nativeAmt != null ? `${fmtCompact(nativeAmt)} COOK` : "—", pct: 100 - bridgedPct, color: "var(--ring-track)" },
                  ]
                : undefined
            }
          />
        </aside>

        {/* halftone sparkline — reference row 2 (fees, honest 10-day series).
            v6 honesty floor: baseline + MIN/MAX/NOW labels with units live on
            the chart itself; the caption keeps title + unit only. */}
        <div className="hero-spark">
          <div className="sparkblock">
            <div className="sparkcap">
              <span>Fees · 10 days · COOK</span>
            </div>
            {feesSeries.length > 2 && (
              <Sparkline points={feesSeries} height={64} unit="COOK" format={feesFmt} />
            )}
          </div>
        </div>

        {/* CTA row: the print button + crumb-trail microcopy (reference) */}
        <div className="hero-cta-row">
          {!wallet.address && (
            <button
              className="btn primary"
              onClick={() => window.dispatchEvent(new CustomEvent("cookiepilot:open-connect"))}
            >
              Connect wallet →
            </button>
          )}
          <span className="crumbwords">Processed · Confirmed · Finalized</span>
        </div>
      </div>

      {/* thin fold-edge stat strip — small tabular entries along the bottom */}
      <div className="hero-strip">
        {/* v6.2 SECONDARY crumb zone — crumbs along the fold-edge
            hairline (restraint law: bite cluster + this one = the two
            per viewport; confined to the band above the first label) */}
        <span className="crumbline" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i />
        </span>
        <span className="hstrip">
          <span className="hlabel">Throughput</span>
          <b>{fmtNum(stats.liveTps ?? stats.tps, stats.liveTps != null && stats.liveTps < 100 ? 1 : 0)}<span className="unit">TPS</span></b>
        </span>
        <span className="hstrip">
          <span className="hlabel">Finality</span>
          <b>3<span className="unit">TICKS TO CEMENT</span></b>
        </span>
        <span className="hstrip">
          <span className="hlabel">Bridged (Hyperlane)</span>
          <b>{bridge?.totalBridged ? fmtCompact(bridge.totalBridged) : "—"}<span className="unit">COOK</span>{bridgedPct != null && <span className="unit">· {bridgedPct.toFixed(1)}%</span>}</b>
        </span>
        <span className="hstrip">
          <span className="hlabel">Height</span>
          <b>{fmtNum(stats.blockHeight, 0)}</b>
        </span>
      </div>
      {/* v8 honesty: finality SLA from txs we actually watched finalize */}
      <div className="slaline" aria-label="finality SLA">
        <span className="sla-k">FINALITY SLA</span>
        {traySamples.length >= 5 ? (
          <span className="sla-v">
            MEDIAN <b>{(traySamples.slice().sort((a, b) => a - b)[Math.floor(traySamples.length / 2)] / 1000).toFixed(1)}s</b> BAKE→TRAY · N={traySamples.length}
            {finalizeSamples.length >= 5 && (
              <> · <b>{Math.round((finalizeSamples.filter((m) => m < 1000).length / finalizeSamples.length) * 100)}%</b> &lt;1s WITNESSED</>
            )}
          </span>
        ) : (
          <span className="sla-v dim">WATCHING THE TRAY…</span>
        )}
      </div>
      {/* v6 fold edge: hairline + small-caps microline replaces the
          fold-bleeding giant "02 — WALLET" peek; no headline crops at the fold */}
      <div className="fold-next" aria-hidden="true">
        <span className="fn-next">Next</span>
        <span className="fn-title">02 — Wallet</span>
      </div>

      {/* vertical marginalia on the page edge (decorative) */}
      <span className="marginalia" aria-hidden="true">
        CookiePilot · live network state · {new Date().toLocaleDateString("en-GB").replaceAll("/", ".")}
      </span>
    </div>
  );
}

/**
 * Network facts microline — section 03 opener. Consumes the shared
 * StatsProvider poll (no second fetch); carries the finality story.
 */
export function NetworkFacts() {
  const { data, loading } = useStats();
  if (!data) return null;
  const { stats, supply, bridge } = data;
  return (
    <div className="factsline">
      <span><b>{stats.baseFee}</b> base fee</span>
      <span><b>3</b> ticks to cement</span>
      <span><b>{fmtCompact(supply.circulating)}</b> COOK circulating</span>
      <span><b>{stats.validators}</b> validators</span>
      <span><b>{fmtCompact(stats.tokensLaunched)}</b> tokens · {fmtNum(stats.programsLaunched, 0)} programs</span>
      {bridge?.totalBridged ? (
        <span className="bridgeline"><b>{fmtCompact(bridge.totalBridged)} COOK</b> bridged from Solana · {fmtNum(bridge.totalTransfers, 0)} transfers · 1:1 Hyperlane</span>
      ) : null}
      {loading && <span className="data" style={{ color: "var(--ember-text)", opacity: 0.8 }}>refreshing…</span>}
    </div>
  );
}

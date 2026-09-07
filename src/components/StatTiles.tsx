import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { fetchBridgeStats, fetchChainStats, fetchCookPrice, fetchDailyAnalytics, ChainStats, CookPrice, DailyAnalytics, BridgeStats } from "../lib/api";
import { usePoll, type PollState } from "../hooks/usePoll";
import { fmtCompact, fmtNum, fmtUsd, pct } from "../lib/format";
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
}

async function fetchAll(): Promise<AllStats> {
  const [stats, price, daily, bridge, supply, perf] = await Promise.all([
    fetchChainStats(),
    fetchCookPrice(),
    fetchDailyAnalytics(),
    fetchBridgeStats().catch(() => null),
    rpc<{ value: { circulating: number; total: number } }>("getSupply", [{ excludeNonCirculatingAccountsList: true }]),
    // block time → the finality story, straight from validator perf samples
    rpc<{ numSlots: number; samplePeriodSecs: number }[]>("getRecentPerformanceSamples", [1]).catch(() => null),
  ]);
  const slotMs = perf?.[0]?.numSlots ? (perf[0].samplePeriodSecs * 1000) / perf[0].numSlots : null;
  return {
    stats,
    price,
    daily,
    bridge: bridge ?? null,
    supply: { circulating: supply.value.circulating / 1e9, total: supply.value.total / 1e9 },
    slotMs,
  };
}

function fmtSlotTime(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  return ms >= 1000 ? `~${(ms / 1000).toFixed(2)}s` : `~${Math.round(ms)}ms`;
}

/* ------------------------------------------------------------------
   v5 POSTER-PURIFY: one shared poll feeds the hero AND section 03,
   so the first viewport can stay a pure poster (no widgets) while
   every datum still has a home below the fold.
------------------------------------------------------------------ */
const StatsCtx = createContext<PollState<AllStats> | null>(null);

export function StatsProvider({ children }: { children: ReactNode }) {
  const poll = usePoll<AllStats>(fetchAll, 30_000);
  return <StatsCtx.Provider value={poll}>{children}</StatsCtx.Provider>;
}

function useStats(): PollState<AllStats> {
  const ctx = useContext(StatsCtx);
  if (!ctx) throw new Error("useStats must be used inside <StatsProvider>");
  return ctx;
}

/**
 * Poster fit for the GIANT price: measure the string at 100px and scale
 * it to fill its column exactly — the Swiss way. Caps per breakpoint via
 * --price-cap (150px desktop / 96px mobile), floors at 24px, and refits
 * on font-load + container resize so no live value can ever overflow.
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
      el.style.fontSize = "100px";
      const w = el.scrollWidth || 1;
      const size = Math.max(24, Math.min(cap, (col.clientWidth / w) * 100 * 0.99));
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
 * THE HERO — the poster front page (v5 POSTER-PURIFY).
 * Masthead lives in the Header; this viewport carries ONLY:
 * the giant COOK price + poster-weight delta, the bitten ember ring
 * centerpiece, and a thin fold-edge stat strip. Everything else
 * (wallet, charts, feed, swap, console) lives in the numbered
 * sections below the fold.
 */
export function StatTiles() {
  const { data, error, refresh } = useStats();
  // hook order is sacred: the fit hook runs on every render, ref or no ref
  const priceText = data ? `$${Number(data.price.data.price.usd).toPrecision(4)}` : "";
  const fitRef = useFitPrice(priceText);

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

  const { stats, price, bridge, supply, slotMs } = data;
  const chg = price.data.price.change24h;
  const up = chg >= 0;
  const epochPct = stats.epochInfo ? (stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch) * 100 : 0;
  // centerpiece ring: share of circulating supply bridged from Solana —
  // honest AND reference-scale loud; falls back to epoch progress while
  // the bridge indexer warms up
  const bridgedPct = bridge?.totalBridged && supply.circulating > 0
    ? Math.min(100, (bridge.totalBridged / supply.circulating) * 100)
    : null;
  const ringPct = bridgedPct ?? epochPct;

  return (
    <div className="hero">
      <div className="hero-grid">
        <div className="hero-main">
          {/* the poster's ONE giant display numeral. 4 significant digits —
              display rounding; the exact price is in the aria-label and
              everywhere fmtUsd appears. Fit-to-column, cap 150px. */}
          <p className="giantprice" ref={fitRef} aria-label={`COOK price ${fmtUsd(price.data.price.usd)}`}>
            {priceText}
          </p>
          <div className="pricemeta">
            {/* poster-weight delta companion: type, not a chip */}
            <span className={`delta-poster ${up ? "" : "down"}`}>
              {up ? "▲" : "▼"} {pct(chg)}
              <em>/ 24H</em>
            </span>
            <span className="pair">COOK / USDC — MAINNET PAIR</span>
          </div>
        </div>

        {/* THE BITE RING — graphic centerpiece (reference-approved.png).
            AM-3: one scallop notch from the track, value prints in the center. */}
        <aside className="hero-side">
          <span className="bite-corner" aria-hidden="true" />
          <BiteRing
            percent={ringPct}
            size={380}
            layout="stacked"
            big={ringPct.toFixed(1)}
            unit="%"
            label={bridgedPct != null ? "of supply bridged" : "of epoch elapsed"}
            sub={`epoch ${stats.epoch ?? "—"} · ${epochPct.toFixed(1)}% through${bridge?.totalBridged ? ` · ${fmtCompact(bridge.totalBridged)} COOK via Hyperlane` : ""}`}
            bakeline={
              <>
                Exactly <b>{ringPct.toFixed(1)}%</b> baked
              </>
            }
          />
        </aside>
      </div>

      {/* thin fold-edge stat strip — the only other thing in viewport 01 */}
      <div className="hero-strip">
        <span className="hstrip">
          <span className="hlabel">Throughput</span>
          <b>{fmtNum(stats.liveTps ?? stats.tps, stats.liveTps != null && stats.liveTps < 100 ? 1 : 0)}<span className="unit">TPS</span></b>
        </span>
        <span className="hstrip">
          <span className="hlabel">Block time</span>
          <b>{fmtSlotTime(slotMs)}</b>
        </span>
        <span className="hstrip">
          <span className="hlabel">Bridged</span>
          <b>{bridge?.totalBridged ? fmtCompact(bridge.totalBridged) : "—"}<span className="unit">COOK</span></b>
        </span>
        <span className="hstrip">
          <span className="hlabel">Height</span>
          <b>{fmtNum(stats.blockHeight, 0)}</b>
        </span>
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
 * StatsProvider poll (no second fetch); carries the finality story
 * that used to crowd the hero.
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

/**
 * Sparkline deck (fees, 10 days) — lives in section 03 analytics now;
 * the poster hero stays pure. Shares the StatsProvider poll.
 */
export function SparkDeck() {
  const { data } = useStats();
  if (!data) return null;
  const feesSeries = data.daily.days.slice(-10).map((d) => d.feesCook);
  if (feesSeries.length < 3) return null;
  const feesLow = Math.min(...feesSeries);
  const feesNow = feesSeries[feesSeries.length - 1];
  return (
    <div className="sparkblock">
      <div className="sparkcap">
        <span>Sparkline · fees, 10 days</span>
        <span className="data">
          LOW <b>{fmtNum(feesLow, feesLow < 100 ? 1 : 0)}</b> — NOW <b>{fmtNum(feesNow, feesNow < 100 ? 1 : 0)}</b> COOK
        </span>
      </div>
      <Sparkline points={feesSeries} height={64} />
    </div>
  );
}

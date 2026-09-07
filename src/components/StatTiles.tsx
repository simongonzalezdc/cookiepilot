import { fetchBridgeStats, fetchChainStats, fetchCookPrice, fetchDailyAnalytics, ChainStats, CookPrice, DailyAnalytics, BridgeStats } from "../lib/api";
import { usePoll } from "../hooks/usePoll";
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

export function StatTiles() {
  const { data, error, refresh } = usePoll(fetchAll, 30_000);

  if (error && !data)
    return (
      <div className="hero">
        <ErrorBox message={error} onRetry={refresh} />
        <div className="herocta">
          <button
            className="btn primary"
            onClick={() => window.dispatchEvent(new CustomEvent("cookiepilot:open-connect"))}
          >
            Connect wallet →
          </button>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="hero">
        <div className="hero-top">
          <span className="livebadge"><span className="dot warn" /> Connecting</span>
        </div>
        <div className="thinking"><i /><i /><i /> <span style={{ marginLeft: 6 }}>lighting the oven — reading chain state</span></div>
      </div>
    );

  const { stats, price, daily, supply, slotMs } = data;
  const chg = price.data.price.change24h;
  const feesSeries = daily.days.slice(-10).map((d) => d.feesCook);
  const feesLow = feesSeries.length ? Math.min(...feesSeries) : 0;
  const feesNow = feesSeries.length ? feesSeries[feesSeries.length - 1] : 0;
  const epochPct = stats.epochInfo ? (stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch) * 100 : 0;
  const subSec = slotMs != null && slotMs < 1000;
  const up = chg >= 0;
  // centerpiece ring: share of circulating supply bridged from Solana —
  // a core chain story that lives mid-scale (reference: 68.4% ring);
  // falls back to epoch progress while the bridge indexer warms up
  const bridgedPct = data.bridge?.totalBridged && supply.circulating > 0
    ? Math.min(100, (data.bridge.totalBridged / supply.circulating) * 100)
    : null;
  const ringPct = bridgedPct ?? epochPct;

  return (
    <div className="hero">
      <div className="hero-top">
        <span className="hero-eyebrow">
          <span className="hero-no" aria-hidden="true">01</span>
          <span className="rule-dash" aria-hidden="true" />
          Network pulse
          <span className="sq" aria-hidden="true" />
        </span>
        <span className="hero-topright">
          <span className="livebadge">
            <span className="dot" /> Live · Mainnet
          </span>
          <span className="hero-slot">
            {stats.epoch != null ? `epoch ${stats.epoch}` : ""}
            {stats.epochInfo ? ` · ${((stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch) * 100).toFixed(1)}% through` : ""}
            {stats.liveTps != null ? ` · ${fmtNum(stats.liveTps, 1)} TPS` : ""}
            {slotMs != null ? ` · block ${fmtSlotTime(slotMs)}` : ""}
            <span className="hidecap"> · refreshes automatically</span>
          </span>
        </span>
      </div>

      <div className="hero-grid">
        <div className="hero-main">
          {/* the poster's GIANT display numeral (reference-approved.png).
              4 significant digits — display rounding; the exact price is
              in the aria-label and everywhere fmtUsd appears. */}
          <p className="giantprice" aria-label={`COOK price ${fmtUsd(price.data.price.usd)}`}>
            {`$${Number(price.data.price.usd).toPrecision(4)}`}
          </p>
          <div className="pricemeta">
            {/* THE ember moment: solid chip, hard ink offset (reference) */}
            <span className="chip-ember">
              {up ? "▲" : "▼"} {pct(chg)} <em>/ 24H</em>
            </span>
            <span className="pair">COOK / USDC — Cookiescan pair</span>
          </div>

          {/* judging frame (AM-5): one-line value proposition */}
          <h1 className="valueprop">
            The oven-fresh cockpit for Cookie Chain. Live analytics, wallet &amp; swaps on a
            sub-second chain
            <span className="hidelong"> — every transfer traced crumb by crumb to the tray.</span>
          </h1>

          <div className="sparkblock">
            <div className="sparkcap">
              <span>Sparkline · fees, 10 days</span>
              <span className="data">
                LOW <b>{fmtNum(feesLow, feesLow < 100 ? 1 : 0)}</b> — NOW <b>{fmtNum(feesNow, feesNow < 100 ? 1 : 0)}</b> COOK
              </span>
            </div>
            {feesSeries.length > 2 && <Sparkline points={feesSeries} height={64} />}
          </div>

          <div className="herostats">
            <div className="herostat">
              <span className="hlabel">Throughput</span>
              <span className="hvalue">
                {fmtNum(stats.liveTps ?? stats.tps, stats.liveTps != null && stats.liveTps < 100 ? 1 : 0)}
                <span className="unit">TPS</span>
              </span>
              <span className="hsub">{subSec ? "sub-second blocks" : "network throughput"}</span>
            </div>
            <div className="herostat">
              <span className="hlabel">Block time</span>
              <span className="hvalue">{fmtSlotTime(slotMs)}</span>
              <span className="hsub">finality in the sub-second club</span>
            </div>
            <div className="herostat">
              <span className="hlabel">24h txns</span>
              <span className="hvalue">{fmtNum(stats.txns24h, 0)}</span>
              <span className="hsub">{fmtCompact(Number(stats.totalTransactions))} lifetime</span>
            </div>
          </div>

          <div className="herocta">
            <button
              className="btn primary"
              onClick={() => window.dispatchEvent(new CustomEvent("cookiepilot:open-connect"))}
            >
              Connect wallet →
            </button>
            <span className="crumbwords">Processed · Confirmed · Finalized</span>
          </div>
        </div>

        {/* RIGHT COLUMN — the bitten donut, graphic centerpiece (reference).
            AM-3: notch cut from the track, value prints in the center. */}
        <aside className="hero-side">
          <span className="bite-corner" aria-hidden="true" />
          <BiteRing
            percent={ringPct}
            size={252}
            layout="stacked"
            big={ringPct.toFixed(1)}
            unit="%"
            label={bridgedPct != null ? "of supply bridged" : "of epoch elapsed"}
            sub={`epoch ${stats.epoch ?? "—"} · ${epochPct.toFixed(1)}% through${data.bridge?.totalBridged ? ` · ${fmtCompact(data.bridge.totalBridged)} COOK via Hyperlane` : ""}`}
            bakeline={
              <>
                Exactly <b>{ringPct.toFixed(1)}%</b> baked
              </>
            }
          />
        </aside>
      </div>

      {/* vertical marginalia on the page edge (decorative) */}
      <span className="marginalia" aria-hidden="true">
        CookiePilot · live network state · {new Date().toLocaleDateString("en-GB").replaceAll("/", ".")}
      </span>
    </div>
  );
}

/**
 * Network facts microline — lives at the top of section 03 (analytics
 * semantics) so the hero keeps the reference's clean poster pacing.
 * Polls its own light set: chain stats + supply + bridge totals.
 */
export function NetworkFacts() {
  const stats = usePoll(fetchChainStats, 30_000);
  const supply = usePoll(async () => {
    const r = await rpc<{ value: { circulating: number } }>("getSupply", [{ excludeNonCirculatingAccountsList: true }]);
    return { circulating: r.value.circulating / 1e9 };
  }, 30_000);
  const bridge = usePoll(fetchBridgeStats, 120_000);
  if (!stats.data) return null;
  return (
    <div className="factsline">
      <span><b>{stats.data.baseFee}</b> base fee</span>
      {supply.data && <span><b>{fmtCompact(supply.data.circulating)}</b> COOK circulating</span>}
      <span><b>{stats.data.validators}</b> validators</span>
      <span><b>{fmtCompact(stats.data.tokensLaunched)}</b> tokens · {fmtNum(stats.data.programsLaunched, 0)} programs</span>
      {bridge.data?.totalBridged ? (
        <span className="bridgeline"><b>{fmtCompact(bridge.data.totalBridged)} COOK</b> bridged from Solana · {fmtNum(bridge.data.totalTransfers, 0)} transfers · 1:1 Hyperlane</span>
      ) : null}
      {stats.loading && <span className="data" style={{ color: "var(--ember-text)", opacity: 0.8 }}>refreshing…</span>}
    </div>
  );
}

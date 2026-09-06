import { fetchBridgeStats, fetchChainStats, fetchCookPrice, fetchDailyAnalytics, ChainStats, CookPrice, DailyAnalytics, BridgeStats } from "../lib/api";
import { usePoll } from "../hooks/usePoll";
import { fmtCompact, fmtNum, fmtUsd, pct } from "../lib/format";
import { ErrorBox, Loading } from "./ui";
import { Sparkline } from "./charts";
import { rpc } from "../lib/rpc";

interface AllStats {
  stats: ChainStats;
  price: CookPrice;
  daily: DailyAnalytics;
  bridge: BridgeStats;
  supply: { circulating: number };
}

async function fetchAll(): Promise<AllStats> {
  const [stats, price, daily, bridge, supply] = await Promise.all([
    fetchChainStats(),
    fetchCookPrice(),
    fetchDailyAnalytics(),
    fetchBridgeStats().catch(() => null),
    rpc<{ value: { circulating: number } }>("getSupply", [{ excludeNonCirculatingAccountsList: true }]),
  ]);
  return { stats, price, daily, bridge: bridge ?? ({} as BridgeStats), supply: { circulating: supply.value.circulating / 1e9 } };
}

export function StatTiles() {
  const { data, error, loading, refresh } = usePoll(fetchAll, 30_000);

  if (error && !data) return <ErrorBox message={error} onRetry={refresh} />;
  if (!data) return <div className="card"><Loading label="reading chain state" /></div>;

  const { stats, price, daily, bridge, supply } = data;
  const chg = price.data.price.change24h;
  const lastDay = daily.days.at(-1);
  const feesSeries = daily.days.slice(-10).map((d) => d.feesCook);
  const epochPct = stats.epochInfo ? (stats.epochInfo.slotIndex / stats.epochInfo.slotsInEpoch) * 100 : null;

  return (
    <div className="grid cols-4">
      <div className="card tile">
        <span className="label">COOK price</span>
        <span className="value">{fmtUsd(price.data.price.usd)}</span>
        <span className={`sub ${chg >= 0 ? "up" : "down"}`}>{pct(chg)} · 24h · Cookiescan</span>
      </div>
      <div className="card tile">
        <span className="label">Live TPS</span>
        <span className="value">{fmtNum(stats.liveTps ?? stats.tps, 1)}</span>
        <span className="sub">~1s blocks · sub-second finality</span>
        {feesSeries.length > 2 && <Sparkline points={feesSeries} height={26} color="#3ddc97" />}
      </div>
      <div className="card tile">
        <span className="label">Transactions</span>
        <span className="value">{fmtCompact(Number(stats.totalTransactions))}</span>
        <span className="sub">{fmtNum(stats.txns24h, 0)} in 24h{lastDay ? ` · ${fmtNum(lastDay.activeWallets, 0)} wallets yesterday` : ""}</span>
      </div>
      <div className="card tile">
        <span className="label">Base fee</span>
        <span className="value">{stats.baseFee}<small style={{ fontSize: 13, color: "var(--muted)" }}> COOK</small></span>
        <span className="sub">per signature ≈ {fmtUsd(Number(stats.baseFee) * (price.data.price.usd || 0))}</span>
      </div>
      <div className="card tile">
        <span className="label">COOK supply</span>
        <span className="value">{fmtCompact(supply.circulating)}</span>
        <span className="sub">circulating · native asset</span>
      </div>
      <div className="card tile">
        <span className="label">Validators</span>
        <span className="value">{stats.validators}</span>
        <span className="sub">community-run · epoch {stats.epoch}{epochPct != null ? ` (${epochPct.toFixed(0)}% through)` : ""}</span>
      </div>
      <div className="card tile">
        <span className="label">Tokens launched</span>
        <span className="value">{fmtCompact(stats.tokensLaunched)}</span>
        <span className="sub">{fmtNum(stats.programsLaunched, 0)} programs deployed</span>
      </div>
      <div className="card tile">
        <span className="label">Bridged from Solana</span>
        <span className="value">{fmtCompact(bridge.totalBridged ?? null)}</span>
        <span className="sub">{bridge.totalTransfers != null ? `${fmtNum(bridge.totalTransfers, 0)} transfers · Hyperlane` : "Hyperlane warp route"}</span>
      </div>
      {loading && <span className="dim" style={{ gridColumn: "1 / -1", fontSize: 11 }}>refreshing…</span>}
    </div>
  );
}

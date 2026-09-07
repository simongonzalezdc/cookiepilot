import { fetchMarkets, PoolMarket, fetchTokenRegistry, RegistryToken } from "../lib/api";
import { usePoll } from "../hooks/usePoll";
import { EmptyState, ErrorBox, Loading } from "./ui";
import { fmtCompact, fmtNum, fmtUsd, pct, shortAddr } from "../lib/format";
import { useState } from "react";
import { IconCoin, IconSwap } from "./icons";

function TokenCell({ token }: { token?: { symbol?: string; mint: string } }) {
  if (!token?.symbol) return <span className="dim">{token ? `${token.mint.slice(0, 6)}…` : "—"}</span>;
  return (
    <a href={`https://cookiescan.io/token/${token.mint}`} target="_blank" rel="noreferrer">
      {token.symbol}
    </a>
  );
}

export function MarketsPanel() {
  const markets = usePoll<PoolMarket[]>(fetchMarkets, 30_000);
  const registry = usePoll<RegistryToken[]>(fetchTokenRegistry, 300_000);
  const [tab, setTab] = useState<"pools" | "tokens">("pools");

  const err = markets.error && !markets.data ? markets.error : registry.error && !registry.data ? registry.error : null;
  if (err) return <div className="card"><ErrorBox message={err} onRetry={tab === "pools" ? markets.refresh : registry.refresh} /></div>;

  const pools = (markets.data ?? [])
    .filter((m) => m.baseToken?.symbol)
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))
    .slice(0, 12);

  const tokens = (registry.data ?? [])
    .filter((t) => (t.marketData?.marketCap ?? 0) > 0)
    .sort((a, b) => (b.marketData?.marketCap ?? 0) - (a.marketData?.marketCap ?? 0))
    .slice(0, 12);

  const changeOf = (mint: string) => registry.data?.find((t) => t.mint === mint)?.price?.change24h;

  return (
    <div className="card">
      <h3>
        Markets
        <span className="right">
          <span className="seg" role="tablist">
            <button className={tab === "pools" ? "on" : ""} onClick={() => setTab("pools")}>Pools</button>
            <button className={tab === "tokens" ? "on" : ""} onClick={() => setTab("tokens")}>Tokens</button>
          </span>
        </span>
      </h3>

      {tab === "pools" &&
        (markets.loading && !pools.length ? (
          <Loading label="loading pools from Cookieswap" />
        ) : pools.length === 0 ? (
          <EmptyState icon={<IconSwap size={24} />} title="No pools indexed yet" body="Cookieswap reports zero markets right now — refresh in a moment." />
        ) : (
          <div className="tblwrap"><table className="tbl">
            <thead>
              <tr>
                <th>Pair</th><th>Venue</th><th className="r">Price (USD)</th><th className="r">Liquidity</th><th className="r">24h</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((m) => (
                <tr key={m.marketId}>
                  <td>
                    <TokenCell token={m.baseToken} />
                    <span className="dim"> / </span>
                    <TokenCell token={m.quoteToken} />
                  </td>
                  <td className="dim">{m.type}</td>
                  <td className="num">{fmtUsd(m.baseToken.priceUsd)}</td>
                  <td className="num">{fmtUsd(m.liquidityUsd)}</td>
                  <td className="num">
                    {(() => {
                      const c = changeOf(m.baseToken.mint);
                      return c === undefined ? "—" : <span className={c >= 0 ? "green" : "red"}>{pct(c, 1)}</span>;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ))}

      {tab === "tokens" &&
        (registry.loading && !tokens.length ? (
          <Loading label="loading token registry" />
        ) : tokens.length === 0 ? (
          <EmptyState icon={<IconCoin size={24} />} title="No tokens with market cap indexed" />
        ) : (
          <div className="tblwrap"><table className="tbl">
            <thead>
              <tr>
                <th>Token</th><th className="r">Price</th><th className="r">24h</th><th className="r">Mkt cap</th><th className="r">Liquidity</th><th className="r">Holders</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.mint}>
                  <td>
                    {t.metadata?.logo && <img className="token-logo" src={t.metadata.logo} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
                    <a href={`https://cookiescan.io/token/${t.mint}`} target="_blank" rel="noreferrer">{t.metadata?.symbol ?? shortAddr(t.mint, 4, 4)}</a>
                    <span className="dim"> {t.metadata?.name}</span>
                  </td>
                  <td className="num">{fmtUsd(t.price?.usd)}</td>
                  <td className="num"><span className={(t.price?.change24h ?? 0) >= 0 ? "green" : "red"}>{pct(t.price?.change24h, 1)}</span></td>
                  <td className="num">{fmtCompact(t.marketData?.marketCap)}</td>
                  <td className="num">{fmtCompact(t.marketData?.liquidity)}</td>
                  <td className="num">{fmtNum(t.marketData?.holderCount ?? 0, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ))}
      <div className="dim" style={{ fontSize: 11, marginTop: 8 }}>
        Pools: Cookiescan venue feed (Cookiebox DAMM/CLMM, Cookieswap, Raydium…) · Tokens: Cookiescan registry ({fmtNum(registry.data?.length ?? 0, 0)} tokens)
      </div>
    </div>
  );
}

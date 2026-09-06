import { useMemo } from "react";
import { useWallet } from "../hooks/useWallet";
import { usePoll } from "../hooks/usePoll";
import { rpc, TokenAccountParsed, AssetItem } from "../lib/rpc";
import { fetchAddressTxs, fetchTokenRegistry, fetchCookPrice, IndexedTx, RegistryToken } from "../lib/api";
import { COOK_MINT, API } from "../lib/config";
import { EmptyState } from "./ui";
import { fmtNum, fmtUsd, shortAddr, timeAgoIso } from "../lib/format";
import { CHAIN } from "../lib/config";
import { IconBox, IconCoin, IconCrumbs, IconWallet } from "./icons";

export function WalletPanel({ onWantConnect }: { onWantConnect: () => void }) {
  const w = useWallet();
  const address = w.address;

  if (!address) {
    return (
      <div className="card">
        <h3>Your wallet</h3>
        <EmptyState
          icon={<IconWallet size={24} />}
          title="No wallet connected"
          body="Connect Nightly (recommended on Cookie Chain) or any standard SVM wallet to see balances, tokens, NFTs and your history."
          action={<button className="btn primary" onClick={onWantConnect}>Connect wallet</button>}
        />
      </div>
    );
  }

  return (
    <div className="walletgrid">
      <TokensCard address={address} balance={w.balance} />
      <HistoryCard address={address} />
      <div style={{ gridColumn: "1 / -1" }}>
        <NftsCard address={address} />
      </div>
    </div>
  );
}

function TokensCard({ address, balance }: { address: string; balance: number | null }) {
  const accts = usePoll<TokenAccountParsed[]>(
    async () => {
      const res = await rpc<{ value: TokenAccountParsed[] }>(
        "getTokenAccountsByOwner",
        [address, { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }, { encoding: "jsonParsed" }],
      );
      return res.value.filter((a) => a.account.data.parsed.info.mint !== COOK_MINT);
    },
    20_000,
    [address],
  );
  const registry = usePoll<RegistryToken[]>(fetchTokenRegistry, 600_000);
  const price = usePoll(fetchCookPrice, 60_000);

  const rows = useMemo(() => {
    const meta = new Map((registry.data ?? []).map((t) => [t.mint, t]));
    return (accts.data ?? [])
      .map((a) => {
        const info = a.account.data.parsed.info;
        const t = meta.get(info.mint);
        const ui = info.tokenAmount.uiAmount ?? 0;
        const priceUsd = t?.price?.usd;
        return {
          mint: info.mint,
          symbol: t?.metadata?.symbol,
          logo: t?.metadata?.logo,
          ui,
          priceUsd,
          value: priceUsd != null ? ui * priceUsd : null,
        };
      })
      .sort((a, b) => (b.value ?? b.ui) - (a.value ?? a.ui));
  }, [accts.data, registry.data]);

  const cookUsd = price.data?.data.price.usd ?? null;

  return (
    <div className="card">
      <h3>Balance & tokens <span className="right">{shortAddr(address, 6, 6)}</span></h3>
      <div className="balbig">
        {balance != null ? fmtNum(balance, 5) : "…"} <small>COOK</small>
      </div>
      <div className="addrline">
        <span className="dim mono" style={{ fontSize: 11.5 }}>
          {cookUsd != null && balance != null ? `≈ ${fmtUsd(balance * cookUsd)} · ` : ""}
          <a href={`https://cookiescan.io/address/${address}`} target="_blank" rel="noreferrer">view on Cookiescan ↗</a>
        </span>
      </div>
      <div style={{ marginTop: 12 }}>
        {accts.error && <div className="warnbox">Couldn't load SPL tokens: {accts.error}</div>}
        {accts.loading && rows.length === 0 && <div className="skeleton" style={{ height: 40 }} />}
        {!accts.loading && rows.length === 0 && (
          <EmptyState
            icon={<IconCoin size={24} />}
            title="No SPL tokens in this wallet"
            body="Only native COOK. SPL tokens you acquire will appear here automatically."
          />
        )}
        {rows.length > 0 && (
          <table className="tbl">
            <thead><tr><th>Token</th><th className="r">Amount</th><th className="r">Value</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.mint}>
                  <td>
                    {r.logo && <img className="token-logo" src={r.logo} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />}
                    <a href={`https://cookiescan.io/token/${r.mint}`} target="_blank" rel="noreferrer">{r.symbol ?? shortAddr(r.mint, 4, 4)}</a>
                  </td>
                  <td className="num">{fmtNum(r.ui, 4)}</td>
                  <td className="num">{r.value != null ? fmtUsd(r.value) : <span className="dim">no price</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HistoryCard({ address }: { address: string }) {
  const hist = usePoll<IndexedTx[]>(() => fetchAddressTxs(address, 1), 30_000, [address]);
  const txs = hist.data ?? [];

  return (
    <div className="card">
      <h3>Recent activity <span className="right">indexer</span></h3>
      {hist.error && !txs.length && <div className="warnbox">History indexer unavailable: {hist.error}</div>}
      {hist.loading && !txs.length && <div className="skeleton" style={{ height: 40 }} />}
      {!hist.loading && !hist.error && txs.length === 0 && (
        <EmptyState
          icon={<IconCrumbs size={24} />}
          title="No transactions yet for this address"
          body={<>Send a ping from the Transactions panel, or get faucet COOK at <a href={CHAIN.faucet} target="_blank" rel="noreferrer">cookoven.xyz/faucet</a>.</>}
        />
      )}
      <div className="feed">
        {txs.slice(0, 8).map((tx) => {
          let label = "transaction";
          try {
            const ins = JSON.parse(tx.instructions) as { programName?: string; type?: string; parsed?: { type?: string } }[];
            const first = ins.find((i) => i.type || i.parsed?.type);
            label = first?.type ?? first?.parsed?.type ?? ins[0]?.programName ?? "transaction";
          } catch {
            /* keep label */
          }
          return (
            <div key={tx.signature} className="txrow">
              <span className={tx.status === "success" ? "ok" : "bad"}>{tx.status === "success" ? "✓" : "✖"}</span>
              <span>
                <a className="sig" href={`${CHAIN.explorer}/tx/${tx.signature}`} target="_blank" rel="noreferrer">{label}</a>
                <div className="meta">fee {tx.fee} COOK · slot {tx.slot.toLocaleString()}</div>
              </span>
              <span className="t">{timeAgoIso(tx.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NftsCard({ address }: { address: string }) {
  const nfts = usePoll<AssetItem[]>(
    async () => {
      const res = await fetch(`${API.chain}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getAssetsByOwner",
          params: { ownerAddress: address, limit: 12, sortBy: { sortBy: "created", sortDirection: "desc" } },
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "DAS error");
      return (json.result?.items ?? []) as AssetItem[];
    },
    120_000,
    [address],
  );
  const items = (nfts.data ?? []).filter((a) => a.interface !== "FungibleToken" && a.interface !== "FungibleAsset");

  return (
    <div className="card">
      <h3>NFTs & collectibles <span className="right">Cookie DAS API · api.cookiescan.io</span></h3>
      {nfts.error && <div className="warnbox">DAS API unavailable: {nfts.error}</div>}
      {nfts.loading && <div className="skeleton" style={{ height: 60 }} />}
      {!nfts.loading && !nfts.error && items.length === 0 && (
        <EmptyState icon={<IconBox size={24} />} title="No NFTs in this wallet" body="Metaplex assets indexed via the official Cookie Chain DAS API will show up here." />
      )}
      {items.length > 0 && (
        <div className="nftgrid">
          {items.map((a) => {
            const name = a.content?.json_metadata?.name ?? a.content?.metadata?.name ?? shortAddr(a.id, 4, 4);
            const img = a.content?.links?.image ?? a.content?.json_metadata?.image;
            return (
              <a className="nft" key={a.id} href={`${CHAIN.explorer}/address/${a.id}`} target="_blank" rel="noreferrer" title={name}>
                {img ? <img src={img} alt={name} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} /> : <div style={{ aspectRatio: 1, background: "var(--panel-2)" }} />}
                <div className="n">{name}</div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

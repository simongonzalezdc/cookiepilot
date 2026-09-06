import { useMemo, useState } from "react";
import { fetchQuote, QuoteResult, searchTokens, RegistryToken } from "../lib/api";
import { COOK_MINT } from "../lib/config";
import { EmptyState } from "./ui";
import { fmtNum } from "../lib/format";
import { useWallet } from "../hooks/useWallet";
import { TxTracker } from "./TxPanel";
import { TxTrack } from "../lib/txs";
import { VersionedTransaction } from "@solana/web3.js";
import { IconSwap } from "./icons";
import { connection } from "../lib/txs";

interface TokenOpt extends RegistryToken {
  label: string;
}

const COOK_OPT: TokenOpt = {
  mint: COOK_MINT,
  metadata: { symbol: "COOK", name: "COOKIE (native)", decimals: 9 },
  label: "COOK — native",
};

function TokenSelect({ value, onChange }: { value: TokenOpt; onChange: (t: TokenOpt) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TokenOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const doSearch = async () => {
    setBusy(true);
    try {
      const hits = await searchTokens(q, 8);
      setResults(hits.map((t) => ({ ...t, label: `${t.metadata?.symbol ?? "?"} — ${t.metadata?.name ?? t.mint.slice(0, 8)}` })));
      setOpen(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="field" style={{ marginBottom: 6 }}>
        <label>{value.label}</label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            value={q}
            placeholder="Search by symbol (COOK, bCOOK, COOKHOUSE…)"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void doSearch()}
          />
          <button className="btn small" disabled={busy || q.trim().length < 1} onClick={() => void doSearch()}>
            {busy ? "…" : "Search"}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="chip" onClick={() => onChange(COOK_OPT)}>native COOK</button>
        {results.map((r) => (
          <button key={r.mint} className="chip" onClick={() => { onChange(r); setOpen(false); }}>
            {r.metadata?.symbol ?? r.mint.slice(0, 6)}
          </button>
        ))}
      </div>
      {open && results.length === 0 && !busy && <div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>No tokens found — try another symbol.</div>}
    </div>
  );
}

export function SwapPanel() {
  const w = useWallet();
  const [inTok, setInTok] = useState<TokenOpt>(COOK_OPT);
  const [outTok, setOutTok] = useState<TokenOpt | null>(null);
  const [amount, setAmount] = useState("10");
  const [slip, setSlip] = useState(500);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [track, setTrack] = useState<TxTrack | null>(null);
  const [signing, setSigning] = useState(false);

  const canQuote = inTok.mint !== outTok?.mint && Number(amount) > 0 && !!outTok;

  const getQuote = async () => {
    setErr(null);
    setQuote(null);
    setBusy(true);
    try {
      const raw = BigInt(Math.round(Number(amount) * 10 ** (inTok.metadata?.decimals ?? 9)));
      const q = await fetchQuote(inTok.mint, outTok!.mint, raw.toString(), slip);
      setQuote(q);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        /404|no route/i.test(msg)
          ? "No route between this pair (pre-graduation launchpad tokens have no pool yet)."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const inDec = inTok.metadata?.decimals ?? 9;
  const outDec = outTok?.metadata?.decimals ?? 9;
  const outUi = useMemo(() => (quote ? Number(quote.multiRoute.totalOutAmount) / 10 ** outDec : null), [quote, outDec]);
  const minUi = useMemo(() => (quote ? Number(quote.multiRoute.minOutAmount) / 10 ** outDec : null), [quote, outDec]);

  const execute = async () => {
    if (!w.address || !quote) return;
    setErr(null);
    setSigning(true);
    try {
      // Candy Shop builds the unsigned tx from the route (keyless). We simulate it on the
      // community RPC, then sign locally with the connected wallet — fully non-custodial.
      const res = await fetch("/swap-api/swap-tx/multi-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ multiRoute: quote.multiRoute, userPublicKey: w.address }),
      });
      if (!res.ok) throw new Error(`Swap service returned HTTP ${res.status}`);
      const { tx: txB64 } = (await res.json()) as { tx: string };
      const vtx = VersionedTransaction.deserialize(Buffer.from(txB64, "base64"));
      const sim = await connection.simulateTransaction(vtx, { sigVerify: false });
      if (sim.value.err) throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)} — not signing.`);
      const signature = await w.sendTransaction(vtx);
      const t0 = performance.now();
      const tr: TxTrack = {
        signature,
        phase: "sending",
        startedAt: t0,
        phaseAt: { signing: t0 },
        kind: `Swap ${inTok.metadata?.symbol} → ${outTok?.metadata?.symbol}`,
      };
      setTrack(tr);
      void w.refreshBalance();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="card" id="swap">
      <h3><IconSwap size={16} /> Quote &amp; execute <span className="right">Cookieswap (Candy Shop) router · keyless quotes</span></h3>
      <div className="swapgrid">
        <div>
          <TokenSelect value={inTok} onChange={setInTok} />
          <div className="swaparrow">↓</div>
          {outTok ? (
            <TokenSelect value={outTok} onChange={setOutTok} />
          ) : (
            <div className="field">
              <label>Output token</label>
              <OutPick onPick={setOutTok} />
            </div>
          )}
          <div className="row2">
            <div className="field">
              <label>Amount in</label>
              <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label>Slippage</label>
              <select value={slip} onChange={(e) => setSlip(Number(e.target.value))}>
                <option value={100}>1%</option>
                <option value={500}>5%</option>
                <option value={1000}>10%</option>
              </select>
            </div>
          </div>
          <button className="btn primary" disabled={!canQuote || busy} onClick={() => void getQuote()}>
            {busy ? "Routing…" : "Get quote"}
          </button>
          {err && <div className="errbox" style={{ marginTop: 10 }}>{err}</div>}
        </div>

        <div>
          {quote && (
            <div>
              <div className="quoteout">
                {fmtNum(outUi ?? 0, 6)} <span style={{ fontSize: 14, color: "var(--muted)" }}>{outTok?.metadata?.symbol}</span>
              </div>
              <div className="dim" style={{ fontSize: 12, margin: "4px 0 10px" }}>
                for {fmtNum(Number(quote.multiRoute.totalInAmount) / 10 ** inDec, 4)} {inTok.metadata?.symbol} · min received {fmtNum(minUi ?? 0, 6)} · impact{" "}
                {quote.multiRoute.combinedPriceImpactPct}% · protocol fee {quote.multiRoute.protocolFeeBps / 100}%
                {quote.multiRoute.lowLiquidity ? " · low liquidity" : ""}
              </div>
              <div>
                {quote.multiRoute.segments.map((s, i) => (
                  <span key={i} className="routepill" title={`pool ${s.poolAddress}`}>
                    {s.programName} {quote.multiRoute.segments.length > 1 ? `${s.percentage}%` : ""} · fee {s.feeBps / 100}%
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                {w.address ? (
                  <button className="btn primary" disabled={signing} onClick={() => void execute()}>
                    {signing ? "Simulating + signing…" : "Simulate & sign with wallet"}
                  </button>
                ) : (
                  <div className="warnbox">
                    Connect a wallet to execute. Quotes are free and keyless — execution signs locally with your wallet and is simulated before sending.
                  </div>
                )}
              </div>
            </div>
          )}
          {!quote && !err && (
            <EmptyState
              icon={<IconSwap size={24} />}
              title="Quotes route all Cookie Chain DEX liquidity"
              body="Cookiebox DAMM/CLMM, Cookieswap BAMM and more. Pick tokens and get a keyless quote — execution needs a funded wallet (see faucet)."
            />
          )}
          {track && <TxTracker track={track} onClear={() => setTrack(null)} />}
        </div>
      </div>
    </div>
  );
}

function OutPick({ onPick }: { onPick: (t: TokenOpt) => void }) {
  const [q, setQ] = useState("");
  const [miss, setMiss] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    if (q.trim().length < 1) return;
    setBusy(true);
    setMiss(false);
    try {
      const r = await searchTokens(q.trim(), 5);
      if (r[0]) onPick({ ...r[0], label: `${r[0].metadata?.symbol ?? "?"} — ${r[0].metadata?.name ?? ""}` });
      else setMiss(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input
        className="mono"
        placeholder="e.g. bCOOK"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void pick()}
      />
      <button className="btn small" disabled={busy || q.trim().length < 1} onClick={() => void pick()}>
        {busy ? "…" : "Pick"}
      </button>
      {miss && <span className="dim" style={{ fontSize: 11.5, alignSelf: "center" }}>no match — press Search chips above</span>}
    </div>
  );
}

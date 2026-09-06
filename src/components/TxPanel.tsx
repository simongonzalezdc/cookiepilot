import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { buildCookTransferTx, buildMemoTx, elapsedMs, sendAndTrack, TxTrack } from "../lib/txs";
import { CHAIN } from "../lib/config";
import { EmptyState } from "./ui";
import { fmtNum, shortAddr } from "../lib/format";
import { lamportsToUi } from "../lib/format";

const STAGES: { key: TxTrack["phase"]; label: string }[] = [
  { key: "signing", label: "Signature" },
  { key: "sending", label: "Sent" },
  { key: "processed", label: "Processed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "finalized", label: "Finalized" },
];

export function TxTracker({ track, onClear }: { track: TxTrack; onClear?: () => void }) {
  const stageIdx = (p: TxTrack["phase"]) => STAGES.findIndex((s) => s.key === p);
  const cur = track.phase === "failed" ? -1 : stageIdx(track.phase);
  const total = elapsedMs(track, "finalized");
  return (
    <div className="track">
      <div className="head">
        <span>{track.kind}</span>
        <span style={{ color: "var(--dim)" }}>· {shortAddr(track.signature, 10, 8)}</span>
        <span style={{ marginLeft: "auto" }}>
          {track.phase === "failed" ? "❌ failed" : track.phase === "finalized" ? `✅ finalized in ${fmtNum((total ?? 0) / 1000, 2)}s` : "⏳ in flight"}
        </span>
      </div>
      <div className="stages">
        {STAGES.map((s, i) => {
          const done = cur > i || track.phase === "finalized";
          const active = cur === i;
          const ms = elapsedMs(track, s.key);
          return (
            <div key={s.key} className={`stage ${done ? "done" : ""} ${active ? "active" : ""}`} style={{ flex: i === 0 ? 0.7 : 1 }}>
              <div className="bar" />
              {s.label}
              <div className="ms">{ms != null ? `${ms}ms` : active ? "…" : ""}</div>
            </div>
          );
        })}
      </div>
      {track.error && <div className="err">{track.error}</div>}
      <div className="links">
        <a href={`${CHAIN.explorer}/tx/${track.signature}`} target="_blank" rel="noreferrer">open on Cookiescan ↗</a>
        {onClear && <button className="btn small ghost" style={{ marginLeft: 10 }} onClick={onClear}>clear</button>}
      </div>
    </div>
  );
}

export function TxPanel() {
  const w = useWallet();
  const [mode, setMode] = useState<"transfer" | "ping">("ping");
  const [dest, setDest] = useState("");
  const [amount, setAmount] = useState("0.001");
  const [memo, setMemo] = useState("cookiepilot ping 🍪");
  const [track, setTrack] = useState<TxTrack | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (!w.address) return;
    setErr(null);
    setBusy(true);
    try {
      const tx =
        mode === "ping"
          ? await buildMemoTx(w.address, memo || "cookiepilot ping")
          : await buildCookTransferTx(w.address, dest.trim(), Number(amount));
      await sendAndTrack(w, tx, mode === "ping" ? "Memo ping" : `Transfer ${amount} COOK`, setTrack);
      void w.refreshBalance();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const funded = (w.balance ?? 0) > 0.00001;

  return (
    <div className="card" id="send">
      <h3>Transactions <span className="right">execute on-chain · live confirmation</span></h3>
      {!w.address ? (
        <EmptyState icon="🔒" title="Connect a wallet to send transactions" body="Everything else on this dashboard is read-only and works without a wallet. Sending requires COOK for the 0.000005 fee." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button className={`btn small ${mode === "ping" ? "primary" : ""}`} onClick={() => setMode("ping")}>Memo ping</button>
            <button className={`btn small ${mode === "transfer" ? "primary" : ""}`} onClick={() => setMode("transfer")}>Send COOK</button>
          </div>
          {mode === "ping" ? (
            <div className="field">
              <label>Memo text (onscribe on-chain via the Memo program)</label>
              <input value={memo} maxLength={120} onChange={(e) => setMemo(e.target.value)} placeholder="cookiepilot ping 🍪" />
            </div>
          ) : (
            <>
              <div className="field">
                <label>Destination address</label>
                <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Base58 address" className="mono" />
              </div>
              <div className="field">
                <label>Amount (COOK)</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn primary" disabled={busy || !funded} onClick={() => void send()}>
              {busy ? "Sending…" : mode === "ping" ? "Send ping" : "Send transfer"}
            </button>
            <span className="dim" style={{ fontSize: 12 }}>
              fee 0.000005 COOK{w.balance != null ? ` · balance ${fmtNum(w.balance, 5)} COOK` : ""}
            </span>
          </div>
          {!funded && (
            <div className="warnbox" style={{ marginTop: 10 }}>
              This wallet has no COOK for fees. Claim 5 free COOK at the{" "}
              <a href={CHAIN.faucet} target="_blank" rel="noreferrer">Cook Oven faucet</a> (follow on X) or bridge via{" "}
              <a href={CHAIN.bridge} target="_blank" rel="noreferrer">Hyperlane</a> — that's enough for ~1,000,000 transactions.
            </div>
          )}
          {err && <div className="errbox" style={{ marginTop: 10 }}>{err}</div>}
          {track && <TxTracker track={track} onClear={() => setTrack(null)} />}
        </>
      )}
    </div>
  );
}

// re-export a helper used by App to show address/amount sanity
export const toUi = lamportsToUi;

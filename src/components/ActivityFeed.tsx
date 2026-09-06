import { useEffect, useRef, useState } from "react";
import { rpc, SignatureInfo } from "../lib/rpc";
import { TOKEN_PROGRAM } from "../lib/config";
import { EmptyState, ErrorBox } from "./ui";
import { shortAddr, timeAgo } from "../lib/format";

interface FeedItem extends SignatureInfo {
  firstSeen: number;
}

/**
 * Live transaction stream: polls getSignaturesForAddress on the SPL Token program
 * (the busiest program on Cookie Chain), diffing new signatures to the top.
 * Confirmation status upgrades (confirmed -> finalized) update in place —
 * showing off sub-second finality without any websocket infra.
 */
export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!paused) {
        try {
          const sigs = await rpc<SignatureInfo[]>(
            "getSignaturesForAddress",
            [TOKEN_PROGRAM, { limit: 12 }],
            { retries: 0, timeoutMs: 10_000 },
          );
          if (!alive) return;
          setError(null);
          setItems((prev) => {
            const fresh = sigs.filter((s) => !seen.current.has(s.signature));
            for (const s of fresh) {
              seen.current.add(s.signature);
              if (prev.length > 0 || seen.current.size > 1) setFlash(s.signature);
            }
            const statusById = new Map(sigs.map((s) => [s.signature, s.confirmationStatus]));
            const upgraded = prev.map((p) => ({
              ...p,
              confirmationStatus: statusById.get(p.signature) ?? p.confirmationStatus,
            }));
            const next = [...fresh.map((f) => ({ ...f, firstSeen: Date.now() })), ...upgraded];
            const trimmed = next.slice(0, 14);
            for (const gone of seen.current) {
              if (!trimmed.some((t) => t.signature === gone)) seen.current.delete(gone);
            }
            return trimmed;
          });
        } catch (e) {
          if (!alive) return;
          setError(e instanceof Error ? e.message : String(e));
        }
      }
      timer = setTimeout(tick, 4000);
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [paused]);

  return (
    <div className="card">
      <h3>
        Live activity <span className="right">SPL Token program · poll 4s</span>
      </h3>
      {error && items.length === 0 && <ErrorBox message={error} onRetry={() => setPaused((p) => !p)} />}
      {items.length === 0 && !error && <Loading />}
      {items.length === 0 && !error && (
        <EmptyState icon="📡" title="Waiting for the first transactions" body="Cookie Chain is quiet right now — new signatures appear here automatically." />
      )}
      <div className="feed">
        {items.map((s) => (
          <div key={s.signature} className={`txrow ${flash === s.signature ? "flash" : ""}`}>
            <span className={s.err ? "bad" : "ok"}>{s.err ? "✖" : "✓"}</span>
            <span>
              <a className="sig" href={`https://cookiescan.io/tx/${s.signature}`} target="_blank" rel="noreferrer">
                {shortAddr(s.signature, 12, 8)}
              </a>
              <div className="meta">
                slot {s.slot.toLocaleString()} ·{" "}
                <span className={s.confirmationStatus === "finalized" ? "green" : "amber"}>
                  {s.confirmationStatus ?? "processing"}
                </span>
                {s.err ? " · failed" : ""}
              </div>
            </span>
            <span className="t">{timeAgo(s.blockTime)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn small" onClick={() => setPaused((p) => !p)}>
          {paused ? "▶ Resume" : "⏸ Pause"}
        </button>
        <span className="dim" style={{ fontSize: 11.5 }}>
          statuses upgrade live: processed → confirmed → finalized (usually &lt; 1s on Cookie Chain)
        </span>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="thinking" style={{ padding: "10px 0" }}>
      <i /><i /><i /> <span style={{ marginLeft: 4 }}>listening for signatures</span>
    </div>
  );
}

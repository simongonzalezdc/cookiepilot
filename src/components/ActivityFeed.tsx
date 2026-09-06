import { useEffect, useRef, useState } from "react";
import { rpc, SignatureInfo } from "../lib/rpc";
import { TOKEN_PROGRAM } from "../lib/config";
import { EmptyState, ErrorBox } from "./ui";
import { shortAddr, timeAgo } from "../lib/format";
import { CrumbTrail } from "./CrumbTrail";
import { IconCheck, IconCross, IconCrumbs, IconPause, IconPlay } from "./icons";

interface FeedItem extends SignatureInfo {
  firstSeen: number;
}

/**
 * Live transaction stream: polls getSignaturesForAddress on the SPL Token program
 * (the busiest program on Cookie Chain), diffing new signatures to the top.
 * Confirmation status upgrades (processed → confirmed → finalized) update in
 * place, instantly — the Crumb Trail stations never wait on animation.
 * Oven ambient (AM-4): new arrivals tray-glide in (600ms, decorative);
 * finalized rows get a one-time golden sheen. Reduced motion → static
 * 2–4% warm sheen on the newest row; labels and stations persist.
 */
export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [arrived, setArrived] = useState<string | null>(null); // new-row glide
  const [sheen, setSheen] = useState<string | null>(null); // finalized confirm
  const seen = useRef<Set<string>>(new Set());
  const prevStatus = useRef<Map<string, string>>(new Map());

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
              if (prev.length > 0 || seen.current.size > 1) setArrived(s.signature);
            }
            const statusById = new Map(sigs.map((s) => [s.signature, s.confirmationStatus]));
            // golden sheen on in-place upgrade to finalized (instant state, decorative sheen)
            for (const [sig, st] of statusById) {
              const before = prevStatus.current.get(sig);
              if (st === "finalized" && before && before !== "finalized") setSheen(sig);
              if (st) prevStatus.current.set(sig, st);
            }
            const upgraded = prev.map((p) => ({
              ...p,
              confirmationStatus: statusById.get(p.signature) ?? p.confirmationStatus,
            }));
            const next = [...fresh.map((f) => ({ ...f, firstSeen: Date.now() })), ...upgraded];
            const trimmed = next.slice(0, 14);
            for (const gone of seen.current) {
              if (!trimmed.some((t) => t.signature === gone)) {
                seen.current.delete(gone);
                prevStatus.current.delete(gone);
              }
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

  // sheen/glide are one-shot: clear after the ambient window
  useEffect(() => {
    if (!arrived && !sheen) return;
    const t = setTimeout(() => {
      setArrived(null);
      setSheen(null);
    }, 1200);
    return () => clearTimeout(t);
  }, [arrived, sheen]);

  return (
    <div className="card">
      <h3>
        <IconCrumbs size={16} /> Transaction stream <span className="right">SPL Token program · poll 4s</span>
      </h3>
      {error && items.length === 0 && <ErrorBox message={error} onRetry={() => setPaused((p) => !p)} />}
      {items.length === 0 && !error && (
        <EmptyState
          icon={<IconCrumbs size={24} />}
          title="Waiting for the first transactions"
          body="Cookie Chain is quiet right now — new signatures appear here automatically."
        />
      )}
      <div className="feed">
        {items.map((s, i) => (
          <div
            key={s.signature}
            className={`txrow ${arrived === s.signature ? "arrive" : ""} ${sheen === s.signature ? "sheen" : ""} ${i === 0 ? "is-new" : ""}`}
          >
            <span className={s.err ? "bad" : "ok"}>{s.err ? <IconCross size={13} /> : <IconCheck size={13} />}</span>
            <span>
              <a className="sig" href={`https://cookiescan.io/tx/${s.signature}`} target="_blank" rel="noreferrer">
                {shortAddr(s.signature, 12, 8)}
              </a>
              <div className="meta">slot {s.slot.toLocaleString()}{s.err ? " · failed" : ""}</div>
              {/* Crumb Trail: three labeled stations, instant, zero-motion readable */}
              <CrumbTrail status={s.confirmationStatus} err={!!s.err} />
            </span>
            <span className="t">{timeAgo(s.blockTime)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn small" onClick={() => setPaused((p) => !p)}>
          {paused ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconPlay size={13} /> Resume</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconPause size={13} /> Pause</span>}
        </button>
        <span className="dim" style={{ fontSize: 12 }}>
          statuses upgrade live: processed → confirmed → finalized (usually &lt; 1s on Cookie Chain)
        </span>
      </div>
    </div>
  );
}

/**
 * Crumb Trail (DESIGN-SYSTEM v2 / AM-4): transaction state as three
 * discrete labeled stations — processed → confirmed → finalized.
 * Icon + text per station, so the state parses with zero motion.
 * Authoritative state updates are instant (never animation-gated);
 * reduced motion renders the identical static contract.
 */
import { IconBite, IconCheck, IconCookieFull, IconCrumbs, IconCross } from "./icons";

const STATIONS = [
  { key: "processed", label: "processed", icon: <IconCrumbs size={13} /> },
  { key: "confirmed", label: "confirmed", icon: <IconBite size={13} /> },
  { key: "finalized", label: "finalized", icon: <IconCookieFull size={13} /> },
] as const;

export function CrumbTrail({ status, err }: { status?: string | null; err?: boolean }) {
  const s = status ?? "processed";
  const idx = s === "finalized" ? 2 : s === "confirmed" ? 1 : 0;
  const stateWord = err ? `failed after ${STATIONS[Math.min(idx, 1)].label}` : STATIONS[idx].label;
  return (
    <span className="crumbs" role="img" aria-label={`tx status: ${stateWord}`}>
      {STATIONS.map((st, i) => {
        const reached = i <= idx;
        const failed = !!err && i === idx;
        const cls = failed ? "failed" : i === idx ? "current" : reached ? "done" : "unreached";
        return (
          <span key={st.key} style={{ display: "inline-flex", alignItems: "center" }}>
            {i > 0 && <span className={`link ${reached ? "done" : ""}`} aria-hidden="true" />}
            <span className={`station ${cls}`}>
              {failed ? <IconCross size={13} /> : st.icon}
              {st.label}
            </span>
          </span>
        );
      })}
      {!err && idx === 2 && (
        <span className="station done" style={{ marginLeft: 4 }}>
          <IconCheck size={12} />
        </span>
      )}
    </span>
  );
}

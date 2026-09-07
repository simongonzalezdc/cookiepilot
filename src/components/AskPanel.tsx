import { useEffect, useRef, useState } from "react";
import { askCookiePilot, NLAnswer } from "../lib/nlq";
import { useWallet } from "../hooks/useWallet";
import { EmptyState } from "./ui";
import { CHAIN } from "../lib/config";
import { IconConsole } from "./icons";

interface Exchange {
  q: string;
  a: NLAnswer | null;
  error?: string;
}

export function AskPanel() {
  const w = useWallet();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  // Keep the latest exchange in view — but never on mount (page must land on
  // the hero, and scrolling the window on mount yanked the first paint off it),
  // and never scrolling the page itself, only the answer list.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [exchanges, busy]);

  const ask = async (query: string) => {
    const text = query.trim();
    if (!text || busy) return;
    setQ("");
    setBusy(true);
    setExchanges((xs) => [...xs.slice(-4), { q: text, a: null }]);
    try {
      const a = await askCookiePilot(text, !!w.address);
      setExchanges((xs) => xs.map((x, i) => (i === xs.length - 1 && x.q === text ? { ...x, a } : x)));
    } catch (e) {
      setExchanges((xs) =>
        xs.map((x, i) => (i === xs.length - 1 && x.q === text ? { ...x, error: e instanceof Error ? e.message : String(e) } : x)),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" id="ask">
      <h3>
        <IconConsole size={16} /> Console <span className="right">deterministic · local · no AI keys</span>
      </h3>
      <form
        className="askbox"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <span className="promptfield">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={"Try: \"top movers\" · \"what's in my wallet\" · \"quote 10 COOK to bCOOK\" · \"price of CHAT\""}
            aria-label="Ask about Cookie Chain"
          />
        </span>
        <button className="btn primary" disabled={busy || !q.trim()}>
          {busy ? "…" : "Ask"}
        </button>
      </form>

      {exchanges.length === 0 && !busy && (
        <EmptyState
          icon={<IconConsole size={24} />}
          title="Your cockpit copilot"
          body="Queries run against the same live APIs as this dashboard — intent matching is deterministic and 100% local. Nothing to configure, nothing to pay."
        />
      )}

      <div className="answer">
        {exchanges.map((x, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span className="querybubble">
                {x.q}
              </span>
            </div>
            {x.error ? (
              <div className="errbox" style={{ marginTop: 8 }}>Query failed: {x.error}</div>
            ) : x.a ? (
              <AnswerView a={x.a} onChip={(c) => { setQ(c); void ask(c); }} />
            ) : (
              <div className="thinking" style={{ marginTop: 8 }}>
                <i /><i /><i /> <span style={{ marginLeft: 4 }}>querying chain</span>
              </div>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>
    </div>
  );
}

function AnswerView({ a, onChip }: { a: NLAnswer; onChip: (chip: string) => void }) {
  return (
    <div>
      <div className="ahead">
        <span>cookiepilot · {a.intent}{a.timingMs != null ? ` · ${a.timingMs}ms` : ""}</span>
      </div>
      <div className="atitle">{a.title}</div>
      {a.body && <div className="abody">{a.body}</div>}
      {a.headers && a.rows && (
        <table className="tbl" style={{ margin: "6px 0" }}>
          <thead><tr>{a.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {a.rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j} className={j === 0 ? "" : "num"}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
      {a.cards && (
        <div className="acards">
          {a.cards.map((c, i) => (
            <div className="acard" key={i}>
              {c.title && <div className="t">{c.title}</div>}
              {c.rows.map((r, j) => (
                <div className="row" key={j}>
                  <span className="k">{r[0]}</span>
                  <span className="v">{r[1]}</span>
                </div>
              ))}
              {c.link && <div style={{ marginTop: 6 }}><a href={c.link.href} target="_blank" rel="noreferrer">{c.link.label} ↗</a></div>}
            </div>
          ))}
        </div>
      )}
      {a.hint && <div className="ahint">{a.hint}</div>}
      {a.chips && (
        <div className="chips">
          {a.chips.map((c) => (
            <button key={c} className="chip" onClick={() => onChip(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      {a.needsWallet && (
        <div className="warnbox" style={{ marginTop: 8 }}>
          Wallet actions need a connection — install <a href="https://nightly.app/" target="_blank" rel="noreferrer">Nightly</a> and click Connect.
        </div>
      )}
      {a.intent === "faucet" && (
        <div className="acards" style={{ marginTop: 8 }}>
          <div className="acard">
            <div className="t">Zero-spend demo path</div>
            <div className="row"><span className="k">This dashboard</span><span className="v">read-only, no wallet needed</span></div>
            <div className="row"><span className="k">Faucet</span><span className="v">5 COOK ≈ 1M transactions</span></div>
          </div>
        </div>
      )}
      {a.intent === "help" && (
        <div className="dim" style={{ marginTop: 8, fontSize: 12.5 }}>
          Agent mode: the official <a href={CHAIN.cookieMcp} target="_blank" rel="noreferrer">cookie-mcp</a> server (npx cookie-mcp) gives any AI agent
          trading, launching, LP, staking and bridging tools — read-only without a key. CookiePilot's console complements it for humans.
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useTheme } from "../lib/theme";
import { CHAIN } from "../lib/config";
import { shortAddr, fmtNum } from "../lib/format";
import { rpc } from "../lib/rpc";
import { usePoll } from "../hooks/usePoll";
import { CookieMark, IconCheck, IconCopy, IconMoon, IconSearch, IconSun } from "./icons";

function monogram(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function WalletModal({ onClose }: { onClose: () => void }) {
  const { wallets, connect, connecting, error } = useWallet();
  const hasNightly = wallets.some((w) => w.id === "nightly");
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Connect a wallet">
        <h4>Connect a wallet</h4>
        <div className="wlist">
          {wallets.length === 0 && (
            <div className="empty" style={{ padding: "12px 4px" }}>
              <div className="icon"><IconSearch size={24} /></div>
              <div className="title">No SVM wallet detected</div>
              <div>Install a wallet extension, then reload this page.</div>
            </div>
          )}
          {wallets.map((w) => (
            <button key={w.id} className="witem" disabled={connecting} onClick={() => connect(w).then(onClose)}>
              <span className="ic" aria-hidden>{monogram(w.name)}</span>
              <span>{w.name}</span>
              {w.recommended && <span className="rec">Recommended on Cookie Chain</span>}
            </button>
          ))}
        </div>
        {error && <div className="errbox" style={{ marginTop: 10 }}>{error}</div>}
        {!hasNightly && (
          <div className="winstall">
            Cookie Chain's docs recommend <a href="https://nightly.app/" target="_blank" rel="noreferrer">Nightly</a> — point it at the
            community RPC <code className="mono">{CHAIN.rpcUrl}</code>. Any standard SVM wallet works (Phantom, Backpack, Solflare).
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      className="themetoggle"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light (vanilla)" : "Switch to dark (cocoa)"}
    >
      {/* reference masthead pill: sun + moon pair, active theme at full ink */}
      <IconSun size={16} className={dark ? "on" : "off"} />
      <span className="tt-sep" aria-hidden="true" />
      <IconMoon size={16} className={dark ? "off" : "on"} />
    </button>
  );
}

export function Header() {
  const w = useWallet();
  const [modal, setModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const net = usePoll(async () => {
    const slot = await rpc<number>("getSlot", [], { retries: 0 });
    return slot;
  }, 3000);

  // other panels can request the connect modal (e.g. empty wallet states)
  useEffect(() => {
    const open = () => setModal(true);
    window.addEventListener("cookiepilot:open-connect", open);
    return () => window.removeEventListener("cookiepilot:open-connect", open);
  }, []);

  return (
    <>
      <header className="header">
        <div className="logo">
          <span className="cookie"><CookieMark size={24} /></span>
          <span>
            CookiePilot <span className="sub">· oven-fresh L2 cockpit</span>
          </span>
        </div>
        <span className="netpill" title={net.error ? net.error : "Live from rpc.cookiescan.io"}>
          <span className={`dot ${net.error ? "off" : net.data ? "" : "warn"}`} aria-hidden="true" />
          {net.error ? "RPC offline" : "Mainnet live"}
        </span>
        <div className="spacer" />
        {w.address ? (
          <span className="wallet-chip" title={w.address}>
            <span className="bal">{w.balance != null ? `${fmtNum(w.balance, 4)} COOK` : "…"}</span>
            <span>
              {shortAddr(w.address)}
              <button
                className="copybtn"
                title="Copy address"
                aria-label="Copy address"
                onClick={async (e) => {
                  e.stopPropagation();
                  await navigator.clipboard.writeText(w.address!).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1000);
                }}
              >
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </button>
            </span>
            <button className="btn small ghost" onClick={() => void w.disconnect()}>Disconnect</button>
          </span>
        ) : null}
        {/* Reference masthead: logo · tagline · ONE live pill · toggle.
            Connect lives on the hero CTA (editorial restraint here). */}
        <ThemeToggle />
      </header>
      {modal && <WalletModal onClose={() => setModal(false)} />}
    </>
  );
}

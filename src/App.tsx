import { useMemo } from "react";
import { WalletCtx, useWalletInternal } from "./hooks/useWallet";
import { Header } from "./components/Header";
import { StatTiles } from "./components/StatTiles";
import { NetworkPanel } from "./components/NetworkPanel";
import { MarketsPanel } from "./components/MarketsPanel";
import { ActivityFeed } from "./components/ActivityFeed";
import { WalletPanel } from "./components/WalletPanel";
import { TxPanel } from "./components/TxPanel";
import { SwapPanel } from "./components/SwapPanel";
import { AskPanel } from "./components/AskPanel";
import { Section } from "./components/ui";
import { CHAIN } from "./lib/config";
import { fetchBridgeStats, BridgeStats } from "./lib/api";
import { usePoll } from "./hooks/usePoll";
import { fmtCompact, fmtNum } from "./lib/format";

export default function App() {
  const wallet = useWalletInternal();
  const ctx = useMemo(() => wallet, [wallet]);

  return (
    <WalletCtx.Provider value={ctx}>
      <div className="shell">
        <Header />
        <StatTiles />
        <BridgeNote />

        <Section no="01" title="Ask CookiePilot" hint="natural language → live chain queries">
          <AskPanel />
        </Section>

        <Section no="02" title="Analytics" hint="indexer + swap feeds">
          <NetworkPanel />
          <div style={{ height: 16 }} />
          <MarketsPanel />
        </Section>

        <Section no="03" title="Live activity" hint="sub-second finality, in the flesh">
          <div className="grid cols-2">
            <ActivityFeed />
            <TxPanel />
          </div>
        </Section>

        <Section no="04" title="Your wallet" hint="Nightly + any standard SVM wallet">
          <WalletPanel onWantConnect={() => window.dispatchEvent(new CustomEvent("cookiepilot:open-connect"))} />
        </Section>

        <Section no="05" title="Swap" hint="keyless quotes · non-custodial execution">
          <SwapPanel />
        </Section>

        <footer className="footer">
          <span>
            🍪 <strong>CookiePilot</strong> — open-source cockpit for Cookie Chain
          </span>
          <a href={CHAIN.docs} target="_blank" rel="noreferrer">docs</a>
          <a href={CHAIN.explorer} target="_blank" rel="noreferrer">explorer</a>
          <a href={CHAIN.faucet} target="_blank" rel="noreferrer">COOK faucet</a>
          <a href={CHAIN.bridge} target="_blank" rel="noreferrer">bridge</a>
          <a href={CHAIN.cookieMcp} target="_blank" rel="noreferrer">cookie-mcp</a>
          <span className="spacer" />
          <span className="mono">
            rpc.cookiescan.io · wss.cookiescan.io · api.cookiescan.io (DAS) · swap.cookiescan.io
          </span>
        </footer>
      </div>
    </WalletCtx.Provider>
  );
}

function BridgeNote() {
  const { data } = usePoll<BridgeStats>(fetchBridgeStats, 120_000);
  if (!data?.totalBridged) return null;
  return (
    <div className="bridgenote">
      <span className="icon" aria-hidden>🌉</span>
      <span>
        <strong>{fmtCompact(data.totalBridged)} COOK</strong> bridged from Solana across{" "}
        {fmtNum(data.totalTransfers, 0)} transfers — 1:1 via the Hyperlane warp route. Last transfer: {data.lastTransferDate}.
      </span>
    </div>
  );
}

import { useMemo } from "react";
import { WalletCtx, useWalletInternal } from "./hooks/useWallet";
import { Header } from "./components/Header";
import { StatTiles, NetworkFacts, StatsProvider } from "./components/StatTiles";
import { NetworkPanel } from "./components/NetworkPanel";
import { MarketsPanel } from "./components/MarketsPanel";
import { ActivityFeed } from "./components/ActivityFeed";
import { WalletPanel } from "./components/WalletPanel";
import { TxPanel } from "./components/TxPanel";
import { SwapPanel } from "./components/SwapPanel";
import { AskPanel } from "./components/AskPanel";
import { Section } from "./components/ui";
import { CHAIN } from "./lib/config";
import { CookieMark, IconChart, IconLink, IconOven, IconSwap, IconWallet } from "./components/icons";

/**
 * v5 POSTER-PURIFY structure (CEO order; DESIGN-SYSTEM v5 addendum):
 * viewport 01 = the poster — masthead (header) + giant COOK price +
 * bitten ember ring + thin fold-edge stat strip. NOTHING else.
 * Below the fold, clean poster sections:
 * deck (value prop) → 02 wallet → 03 analytics → 04 live feed
 * (Crumb Trail) → 05 swap + NL console.
 */
export default function App() {
  const wallet = useWalletInternal();
  const ctx = useMemo(() => wallet, [wallet]);

  return (
    <WalletCtx.Provider value={ctx}>
      <StatsProvider>
        <div className="shell">
          <Header />
          <StatTiles />

          <Section no="02" title="Wallet" hint="Nightly + any standard SVM wallet" icon={<IconWallet size={20} />}>
            <WalletPanel onWantConnect={() => window.dispatchEvent(new CustomEvent("cookiepilot:open-connect"))} />
          </Section>

          <Section no="03" title="Analytics" hint="indexer + swap feeds" icon={<IconChart size={20} />}>
            <NetworkFacts />
            <NetworkPanel />
            <div style={{ height: 18 }} />
            <MarketsPanel />
          </Section>

          <Section no="04" title="Live activity" hint="sub-second finality, on the Crumb Trail" icon={<IconOven size={20} />}>
            <div className="grid cols-2">
              <ActivityFeed />
              <TxPanel />
            </div>
          </Section>

          <Section no="05" title="Swap & console" hint="keyless quotes · non-custodial execution · NL chain queries" icon={<IconSwap size={20} />}>
            <SwapPanel />
            <div style={{ height: 18 }} />
            <AskPanel />
          </Section>

          <footer className="footer">
            <span className="brandmark">
              <CookieMark size={17} /> <strong>CookiePilot</strong> — open-source cockpit for Cookie Chain
            </span>
            <a href={CHAIN.docs} target="_blank" rel="noreferrer">docs</a>
            <a href={CHAIN.explorer} target="_blank" rel="noreferrer">explorer</a>
            <a href={CHAIN.faucet} target="_blank" rel="noreferrer">COOK faucet</a>
            <a href={CHAIN.bridge} target="_blank" rel="noreferrer">bridge <IconLink size={13} /></a>
            <a href={CHAIN.cookieMcp} target="_blank" rel="noreferrer">cookie-mcp</a>
            <span className="spacer" />
            <span className="mono">
              rpc.cookiescan.io · wss.cookiescan.io · api.cookiescan.io (DAS) · swap.cookiescan.io
            </span>
          </footer>
        </div>
      </StatsProvider>
    </WalletCtx.Provider>
  );
}

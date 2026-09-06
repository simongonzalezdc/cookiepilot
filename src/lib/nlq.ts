// CookiePilot natural-language console.
// A deterministic, local intent mapper over the same public APIs the dashboard uses.
// No paid AI: pattern match -> resolve entities via the token registry -> run the query.
// (For fully agentic trading there is the official cookie-mcp — see README + Help answer.)

import { searchTokens, RegistryToken, fetchQuote, fetchChainStats, fetchDailyAnalytics, fetchBridgeStats, fetchCookPrice, fetchTokenRegistry } from "./api";
import { CHAIN, COOK_MINT } from "./config";
import { fmtNum, fmtUsd, pct } from "./format";

export interface AnswerCard {
  title: string;
  rows: [string, string][];
  link?: { label: string; href: string };
}

export interface NLAnswer {
  intent: string;
  title: string;
  body?: string;
  cards?: AnswerCard[];
  chips?: string[];
  rows?: string[][];
  headers?: string[];
  directive?: { target: "wallet" | "activity" | "swap" | "markets" | "send" | "faucet" | "network" };
  needsWallet?: boolean;
  hint?: string;
  timingMs?: number;
}

type Intent = { patterns: RegExp[]; run: (q: string, m: RegExpMatchArray, ctx: { connected: boolean }) => Promise<NLAnswer> };

const HELP_CHIPS = [
  "top movers",
  "what's in my wallet",
  "price of bCOOK",
  "network health",
  "recent transactions",
  "top programs",
  "quote 10 COOK to bCOOK",
  "bridge stats",
  "top tokens",
  "how do I get COOK?",
];

const help = (): NLAnswer => ({
  intent: "help",
  title: "Ask CookiePilot — try one of these",
  chips: HELP_CHIPS,
  body: "I answer from live Cookie Chain data (RPC + Cookiescan + Cookieswap APIs) using a local deterministic intent engine — no paid AI, no keys. Tip: for an MCP agent that can also trade, launch and LP, see cookie-mcp.",
});

async function resolveToken(symbol: string): Promise<RegistryToken | null> {
  const q = symbol.replace(/^[$]/, "").trim();
  if (!q) return null;
  if (/^cook$/i.test(q)) {
    // COOK itself is not in the SPL registry; synthesize from the price endpoint
    const p = await fetchCookPrice();
    return {
      mint: COOK_MINT,
      metadata: { name: "COOKIE", symbol: "COOK", decimals: 9 },
      price: { usd: p.data.price.usd, native: 1, change24h: p.data.price.change24h },
    };
  }
  const hits = await searchTokens(q, 6);
  const exact = hits.find((t) => t.metadata?.symbol?.toLowerCase() === q.toLowerCase());
  return exact ?? hits[0] ?? null;
}

const INTENTS: Intent[] = [
  {
    patterns: [/^\s*(help|what can (you|i) do|commands?)\b/i],
    run: async () => help(),
  },
  {
    patterns: [/\b(faucet|get (free )?cook|free tokens|need cook|need funds|no funds)\b/i],
    run: async () => ({
      intent: "faucet",
      title: "Getting COOK — the capital story",
      body:
        `Cookie Chain is a single community mainnet (no devnet). The COOK Faucet by Cook Oven drops 5 COOK ` +
        `to anyone who follows Cook Oven on X. At ~0.000005 COOK per signature, 5 COOK covers ~1,000,000 transactions. ` +
        `You can also bridge COOK 1:1 from Solana via Hyperlane.`,
      cards: [
        {
          title: "COOK Faucet (Cook Oven)",
          rows: [["Reward", "5 COOK per claim"], ["Requirement", "Follow Cook Oven on X"]],
          link: { label: "Open faucet", href: CHAIN.faucet },
        },
        {
          title: "Hyperlane bridge",
          rows: [["Route", "Solana ⇄ Cookie Chain, 1:1"]],
          link: { label: "Open bridge", href: CHAIN.bridge },
        },
      ],
      directive: { target: "faucet" },
    }),
  },
  {
    patterns: [
      /\b(what('| i)?s in my wallet|my wallet|my balance|my portfolio|my tokens|my nfts|my history|my transactions|my txs)\b/i,
    ],
    run: async (_q, _m, ctx) => ({
      intent: "wallet",
      title: ctx.connected ? "Your wallet" : "Connect a wallet first",
      body: ctx.connected
        ? "Rendering your balances, tokens, NFTs and recent activity in the Wallet panel."
        : "I'm read-only until a wallet is connected. Click Connect (Nightly is the recommended wallet for Cookie Chain) and ask again.",
      needsWallet: !ctx.connected,
      directive: { target: "wallet" },
    }),
  },
  {
    patterns: [/\b(top|biggest) (movers?|gainers?|losers?)\b/i, /\bmovers?\b/i],
    run: async () => {
      const t0 = performance.now();
      // the markets feed lacks 24h change; rank via the token registry
      const reg = await fetchTokenRegistry();
      const movers = reg
        .filter((t) => t.price?.change24h !== undefined && t.price.change24h !== 0 && (t.marketData?.liquidity ?? 0) > 100)
        .sort((a, b) => (b.price!.change24h ?? 0) - (a.price!.change24h ?? 0));
      const up = movers.slice(0, 5);
      const down = movers.slice(-5).reverse();
      const card = (list: RegistryToken[]): AnswerCard => ({
        title: "",
        rows: list.map((t) => [
          `${t.metadata?.symbol ?? "?"} — ${t.metadata?.name ?? ""}`,
          `${fmtUsd(t.price?.usd)}  ${pct(t.price?.change24h)} (24h)`,
        ]),
      });
      return {
        intent: "movers",
        title: "Top movers (24h, tokens with real liquidity)",
        cards: [
          { ...card(up), title: "Leading" },
          { ...card(down), title: "Lagging" },
        ],
        hint: "Sorted by 24h price change from the Cookiescan token registry.",
        timingMs: Math.round(performance.now() - t0),
      };
    },
  },
  {
    patterns: [/\b(top|biggest|largest) (tokens?|coins?|caps?|market caps?)\b/i, /\bby market cap\b/i],
    run: async () => {
      const t0 = performance.now();
      const reg = await fetchTokenRegistry();
      const top = reg
        .filter((t) => (t.marketData?.marketCap ?? 0) > 0)
        .sort((a, b) => (b.marketData?.marketCap ?? 0) - (a.marketData?.marketCap ?? 0))
        .slice(0, 8);
      return {
        intent: "top-tokens",
        title: "Top tokens by market cap",
        headers: ["Token", "Price", "24h", "Mkt cap", "Liquidity", "Holders"],
        rows: top.map((t) => [
          `${t.metadata?.symbol ?? "?"} (${t.metadata?.name ?? ""})`,
          fmtUsd(t.price?.usd),
          pct(t.price?.change24h),
          fmtUsd(t.marketData?.marketCap),
          fmtUsd(t.marketData?.liquidity),
          String(t.marketData?.holderCount ?? t.holderCount ?? "—"),
        ]),
        directive: { target: "markets" },
        timingMs: Math.round(performance.now() - t0),
      };
    },
  },
  {
    patterns: [/\b(network|chain|tps|health|status|validators?|epoch|how (fast|healthy))\b/i],
    run: async () => {
      const t0 = performance.now();
      const [stats, daily] = await Promise.all([fetchChainStats(), fetchDailyAnalytics()]);
      const last = daily.days.at(-1);
      return {
        intent: "network",
        title: `Cookie Chain network health — epoch ${stats.epoch}, ${stats.validators} validators`,
        cards: [
          {
            title: "Live",
            rows: [
              ["TPS (live)", String(stats.liveTps ?? stats.tps)],
              ["Slot", fmtNum(stats.slot, 0)],
              ["Block height", fmtNum(stats.blockHeight, 0)],
              ["Base fee", `${stats.baseFee} COOK / signature`],
              ["Total transactions", fmtNum(Number(stats.totalTransactions), 0)],
            ],
          },
          {
            title: "Last 24h + ecosystem",
            rows: [
              ["Transactions (24h)", fmtNum(stats.txns24h, 0)],
              ...(last ? ([["Active wallets (yesterday)", fmtNum(last.activeWallets, 0)]] as [string, string][]) : []),
              ["Tokens launched", fmtNum(stats.tokensLaunched, 0)],
              ["Programs launched", fmtNum(stats.programsLaunched, 0)],
            ],
          },
        ],
        directive: { target: "network" },
        timingMs: Math.round(performance.now() - t0),
      };
    },
  },
  {
    patterns: [/\b(recent|latest|live) (transactions?|txs?|activity)\b/i, /\bwhat('?s| is) happening\b/i],
    run: async () => ({
      intent: "activity",
      title: "Live transaction feed",
      body: "Streaming the latest confirmed transactions below — Cookie Chain finalizes blocks in under a second.",
      directive: { target: "activity" },
    }),
  },
  {
    patterns: [/\b(top|busiest|most used) programs?\b/i, /\bprograms?\b/i],
    run: async () => {
      const t0 = performance.now();
      const daily = await fetchDailyAnalytics();
      return {
        intent: "programs",
        title: "Top programs by transactions (recent window)",
        headers: ["Program", "Txns"],
        rows: daily.topPrograms.slice(0, 8).map((p) => [p.programId, fmtNum(p.txns, 0)]),
        directive: { target: "network" },
        timingMs: Math.round(performance.now() - t0),
      };
    },
  },
  {
    patterns: [/\bbridge\b.*\b(stats?|flows?|volume|how much)\b/i, /\bhow much.*bridged\b/i],
    run: async () => {
      const t0 = performance.now();
      const b = await fetchBridgeStats();
      return {
        intent: "bridge",
        title: "Solana ⇄ Cookie Chain bridge",
        cards: [
          {
            title: "Hyperlane warp route",
            rows: [
              ["Total bridged", `${fmtNum(b.totalBridged)} COOK`],
              ["Locked on Solana", `${fmtNum(b.solanaLocked)} COOK`],
              ["On Cookie Chain", `${fmtNum(b.cookieLocked)} COOK`],
              ["Transfers", fmtNum(b.totalTransfers, 0)],
              ["Solana→Cookie / Cookie→Solana", `${fmtNum(b.solToGorTransfers, 0)} / ${fmtNum(b.gorToSolTransfers, 0)}`],
              ["Last transfer", b.lastTransferDate],
            ],
          },
        ],
        timingMs: Math.round(performance.now() - t0),
      };
    },
  },
  {
    patterns: [
      /\b(quote|swap|exchange|convert|trade)\b\s*(?:me\s*)?([\d.,]+)?\s*\$?([a-z0-9.]+)\s*(?:to|for|into|->|→)\s*\$?([a-z0-9.]+)/i,
    ],
    run: async (_q, m) => {
      const t0 = performance.now();
      const amount = m[2] ? Number(m[2].replace(/,/g, "")) : 1;
      if (!Number.isFinite(amount) || amount <= 0) return { intent: "quote", title: "I couldn't parse that amount — try: quote 10 COOK to bCOOK" };
      const [inTok, outTok] = await Promise.all([resolveToken(m[3]), resolveToken(m[4])]);
      if (!inTok) return { intent: "quote", title: `I couldn't find a token like "${m[3]}"`, hint: "Try the full symbol, e.g. COOK, bCOOK, COOKHOUSE." };
      if (!outTok) return { intent: "quote", title: `I couldn't find a token like "${m[4]}"` };
      const raw = BigInt(Math.round(amount * 10 ** (inTok.metadata?.decimals ?? 9))).toString();
      try {
        const q = await fetchQuote(inTok.mint, outTok.mint, raw);
        const outUi = Number(q.multiRoute.totalOutAmount) / 10 ** (outTok.metadata?.decimals ?? 9);
        const minUi = Number(q.multiRoute.minOutAmount) / 10 ** (outTok.metadata?.decimals ?? 9);
        return {
          intent: "quote",
          title: `${fmtNum(amount, 4)} ${inTok.metadata?.symbol} → ${fmtNum(outUi, 6)} ${outTok.metadata?.symbol}`,
          body: `Best route via ${q.multiRoute.programName}${q.multiRoute.isSplit ? " (split across pools)" : ""}. Min. received after ${q.multiRoute.protocolFeeBps / 100}% protocol fee + slippage: ${fmtNum(minUi, 6)} ${outTok.metadata?.symbol}. Open the Swap panel to execute with your wallet.`,
          cards: [
            {
              title: "Route",
              rows: q.multiRoute.segments.slice(0, 4).map((s) => [
                `${s.programName}${q.multiRoute.segments.length > 1 ? ` — ${s.percentage}%` : ""}`,
                `${fmtNum(Number(s.inAmount) / 10 ** (inTok.metadata?.decimals ?? 9), 4)} → ${fmtNum(Number(s.outAmount) / 10 ** (outTok.metadata?.decimals ?? 9), 6)} · fee ${s.feeBps / 100}%`,
              ]),
            },
          ],
          directive: { target: "swap" },
          timingMs: Math.round(performance.now() - t0),
        };
      } catch {
        return {
          intent: "quote",
          title: "No route found for that pair",
          hint: "One side may be a pre-graduation launchpad token (bonding curve, no DEX pool yet), or liquidity is too thin.",
        };
      }
    },
  },
  {
    patterns: [/\b(price|worth|value|how much)\b/i],
    run: async (q) => priceIntent(performance.now(), q),
  },
];

// The "price of X" intent needs the symbol, which the shared regex above can't capture
// generically — handle it with its own scan before falling back.
async function priceIntent(t0: number, query?: string): Promise<NLAnswer> {
  const m = query?.match(/\b(?:price of|price for|how much is|value of|worth of)\s+\$?([a-z0-9.]{2,15})/i)
    ?? query?.match(/\$?([a-z0-9.]{2,15})\s+price/i);
  if (!m) {
    const p = await fetchCookPrice();
    return {
      intent: "price",
      title: "COOK is the native asset of Cookie Chain",
      cards: [
        {
          title: "COOK / COOKIE",
          rows: [
            ["Price (USD)", fmtUsd(p.data.price.usd)],
            ["24h change", pct(p.data.price.change24h)],
            ["Fees", "0.000005 COOK per signature"],
          ],
        },
      ],
      hint: 'Try: "price of bCOOK" or "top tokens" for the full board.',
      timingMs: Math.round(performance.now() - t0),
    };
  }
  const tok = await resolveToken(m[1]);
  if (!tok) return { intent: "price", title: `I couldn't find a token like "${m[1]}"`, hint: "Symbols are case-insensitive — try COOK, bCOOK, COOKHOUSE." };
  return {
    intent: "price",
    title: `${tok.metadata?.symbol ?? "?"} — ${tok.metadata?.name ?? "Unknown token"}`,
    cards: [
      {
        title: "Market",
        rows: [
          ["Price (USD)", fmtUsd(tok.price?.usd)],
          ["Price (COOK)", tok.price?.native !== undefined ? fmtNum(tok.price.native, 6) : "—"],
          ["24h change", pct(tok.price?.change24h)],
          ["Market cap", fmtUsd(tok.marketData?.marketCap)],
          ["24h volume", fmtUsd(tok.marketData?.volume24h)],
          ["Liquidity", fmtUsd(tok.marketData?.liquidity)],
          ["Holders", String(tok.marketData?.holderCount ?? "—")],
          ["Mint", tok.mint],
        ],
        link: { label: "View on Cookiescan", href: `https://cookiescan.io/token/${tok.mint}` },
      },
    ],
    hint: tok.metadata?.description?.slice(0, 220),
    timingMs: Math.round(performance.now() - t0),
  };
}

export async function askCookiePilot(query: string, connected: boolean): Promise<NLAnswer> {
  const q = query.trim();
  if (!q) return help();
  const t0 = performance.now();

  // price intent needs the raw query for symbol extraction — check it first
  if (/\b(price|worth|value)\b/i.test(q) || /\bhow much is\b/i.test(q)) {
    const a = await priceIntent(t0, q);
    return { ...a, timingMs: a.timingMs ?? Math.round(performance.now() - t0) };
  }

  for (const intent of INTENTS) {
    for (const p of intent.patterns) {
      const m = q.match(p);
      if (m) {
        const a = await intent.run(q, m, { connected });
        return { ...a, timingMs: a.timingMs ?? Math.round(performance.now() - t0) };
      }
    }
  }
  // fall back: treat the whole query as a token search
  const tok = await resolveToken(q);
  if (tok) {
    return priceIntent(t0, `price of ${tok.metadata?.symbol ?? q}`);
  }
  return {
    ...help(),
    title: "I didn't catch that — I'm a deterministic console, not a chatbot",
    body: "These I can answer right now, from live chain data:",
  };
}

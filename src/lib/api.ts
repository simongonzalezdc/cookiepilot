import { API } from "./config";

/** Explorer (Cookiescan) REST + Candy Shop swap REST, all via origin proxies. */

async function getJson<T>(url: string, timeoutMs = 15_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- network stats ----------

export interface ChainStats {
  network: string;
  rpcUrl: string;
  blockHeight: number;
  slot: number;
  epoch: number;
  totalTransactions: string;
  tps: number;
  liveTps: number;
  totalSupply: string;
  validators: number;
  baseFee: string;
  txns24h: number;
  tokensLaunched: number;
  programsLaunched: number;
  epochInfo?: { slotIndex: number; slotsInEpoch: number };
}

export const fetchChainStats = () => getJson<ChainStats>(`${API.explorer}/mainnet/stats`);

export interface DailyAnalytics {
  days: { date: string; txns: number; activeWallets: number; feesCook: number; failed: number }[];
  topPrograms: { programId: string; txns: number }[];
}

export const fetchDailyAnalytics = () => getJson<DailyAnalytics>(`${API.explorer}/analytics/daily`);

export interface BridgeStats {
  totalBridged: number;
  solanaLocked: number;
  cookieLocked: number;
  totalTransfers: number;
  solToGorTransfers: number;
  gorToSolTransfers: number;
  lastTransferDate: string;
}

export const fetchBridgeStats = () => getJson<BridgeStats>(`${API.explorer}/bridge/stats`);

export interface CookPrice {
  success: boolean;
  data: { price: { usd: number; native: number; change24h: number } };
}

export const fetchCookPrice = () => getJson<CookPrice>(`${API.chain}/api/price/cook`);

// ---------- token registry + markets ----------

export interface RegistryToken {
  mint: string;
  metadata?: { name?: string; symbol?: string; logo?: string; decimals?: number; description?: string };
  price?: { usd?: number; native?: number; change24h?: number };
  marketData?: {
    volume24h?: number;
    liquidity?: number;
    marketCap?: number;
    supply?: number;
    holderCount?: number;
  };
  holderCount?: number;
}

/** Cookiescan's index exposes a flat token shape; normalize to our nested view. */
interface FlatToken {
  mint: string;
  symbol?: string;
  name?: string;
  logoUri?: string;
  logo?: string;
  decimals?: number;
  description?: string;
  price?: string | number;
  change24h?: string | number;
  marketCap?: string | number;
  volume24h?: string | number;
  liquidity?: string | number;
  supply?: string | number;
  holderCount?: number;
  holders?: number;
}

const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function normalizeToken(t: FlatToken): RegistryToken {
  const usd = num(t.price);
  const chg = num(t.change24h);
  const native = usd != null ? usd : undefined;
  return {
    mint: t.mint,
    metadata: {
      name: t.name,
      symbol: t.symbol,
      logo: t.logoUri ?? t.logo,
      decimals: t.decimals,
      description: t.description,
    },
    price: usd != null || chg != null ? { usd, native, change24h: chg } : undefined,
    marketData: {
      volume24h: num(t.volume24h),
      liquidity: num(t.liquidity),
      marketCap: num(t.marketCap),
      supply: num(t.supply),
      holderCount: t.holderCount ?? t.holders,
    },
    holderCount: t.holderCount ?? t.holders,
  };
}

export async function fetchTokenRegistry(): Promise<RegistryToken[]> {
  const json = await getJson<FlatToken[] | { data?: FlatToken[] }>(`${API.explorer}/tokens`, 25_000);
  const arr = Array.isArray(json) ? json : (json.data ?? []);
  return arr.map(normalizeToken);
}

export async function searchTokens(query: string, limit = 6): Promise<RegistryToken[]> {
  const json = await getJson<FlatToken[]>(
    `${API.explorer}/tokens?search=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return (Array.isArray(json) ? json : []).map(normalizeToken);
}

export interface PoolMarket {
  marketId: string;
  type: string;
  baseToken: { mint: string; symbol?: string; amount: number; priceUsd?: number };
  quoteToken: { mint: string; symbol?: string; amount: number; priceUsd?: number };
  liquidityUsd?: number;
  liquidityDisplay?: string;
}

export async function fetchMarkets(): Promise<PoolMarket[]> {
  // Pool/venue feed lives on the Cookiescan API (same source cookie-mcp uses);
  // swap.cookiescan.io/api/markets is a separate flat token list, not pools.
  const json = await getJson<{ markets?: PoolMarket[] } | PoolMarket[]>(`${API.chain}/api/markets`, 25_000);
  if (Array.isArray(json)) return json;
  return json.markets ?? [];
}

// ---------- address tx history (indexer, parsed) ----------

export interface IndexedInstruction {
  programId?: string;
  programName?: string;
  type?: string;
  parsed?: { info?: Record<string, unknown>; type?: string } | string;
  data?: string;
  isInner?: boolean;
}

export interface IndexedTx {
  signature: string;
  slot: number;
  blockHeight: number;
  timestamp: string;
  fee: string;
  status: "success" | "failed" | string;
  instructions: string; // stringified JSON of IndexedInstruction[]
  accounts: string;
}

export async function fetchAddressTxs(address: string, page = 1): Promise<IndexedTx[]> {
  const json = await getJson<IndexedTx[] | { error: string }>(
    `${API.explorer}/address/${address}/transactions?page=${page}`,
  );
  return Array.isArray(json) ? json : [];
}

// ---------- swap quotes (Candy Shop / Cookieswap, keyless) ----------

export interface QuoteSegment {
  dex: string;
  poolAddress: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  feeBps: number;
  percentage: number;
  hopIndex: number;
  inputMint: string;
  outputMint: string;
  programName: string;
}

export interface QuoteResult {
  multiRoute: {
    segments: QuoteSegment[];
    totalInAmount: string;
    totalOutAmount: string;
    combinedPriceImpactPct: number;
    minOutAmount: string;
    grossOutAmount: string;
    protocolFeeAmount: string;
    protocolFeeBps: number;
    isSplit: boolean;
    isMultiHop: boolean;
    programName: string;
    lowLiquidity: boolean;
    route: string[];
  };
  snapshotVersion: number;
}

export async function fetchQuote(
  inputMint: string,
  outputMint: string,
  amountRaw: string,
  slippageBps = 500,
): Promise<QuoteResult> {
  const q = new URLSearchParams({ inputMint, outputMint, amount: amountRaw, slippageBps: String(slippageBps) });
  return getJson<QuoteResult>(`${API.swap}/quote/multi-route?${q}`, 20_000);
}

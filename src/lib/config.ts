// Cookie Chain endpoints + well-known constants.
// All values verified live on 2026-09-06 (see README "Verified endpoints").

export const CHAIN = {
  name: "Cookie Chain",
  rpcUrl: "https://rpc.cookiescan.io",
  wsUrl: "wss://wss.cookiescan.io",
  explorer: "https://cookiescan.io",
  docs: "https://docs.cookiechain.wtf",
  faucet: "https://cookoven.xyz/faucet",
  bridge: "https://hyperlane.cookiescan.io",
  cookieMcp: "https://github.com/cookiechain/cookie-mcp",
} as const;

// Native COOK lives at the well-known NATIVE_MINT address (9 decimals), like wSOL on Solana.
// The chain's actual fee-paying native asset IS COOK (see getSupply / getBalance).
export const COOK_MINT = "So11111111111111111111111111111111111111112";
export const COOK_DECIMALS = 9;
export const COOK_SOLANA_MINT = "36ZrtQoab5MhhySaP1YSTwUahSk6GRVUTtZ6cuVfm9e1"; // bridged side

export const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
export const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

export const PROGRAM_NAMES: Record<string, string> = {
  [SYSTEM_PROGRAM]: "System",
  [TOKEN_PROGRAM]: "SPL Token",
  [TOKEN_2022_PROGRAM]: "Token-2022",
  [ATA_PROGRAM]: "ATA",
  [MEMO_PROGRAM]: "Memo",
  metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s: "Metaplex Metadata",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV: "Jupiter v6",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM v4",
  DAMMjDCEFTDkt7ywazZS8GoaLtjb3HaJo3pLbf64xrPY: "Cookiebox DAMM v2",
  DBCg4ugDEztk6MbqHEJvx5a5YGJTj45Jb5NvtQ48Rvsf: "Cookiebox DBC",
  CLMMmWqTtyNSomqXP3kETJy2SGKPdr31USsm4GfbLyKs: "Cookiebox CLMM",
  SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf: "Squads v4",
  namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX: ".cook Names",
  BPFLoaderUpgradeab1e11111111111111111111111: "BPF Loader (programs)",
};

/** Curated anchor accounts so a first-time viewer sees real data instantly. */
export const FEATURED_ACCOUNTS: { label: string; address: string; blurb: string }[] = [
  {
    label: "Cookie Jar",
    address: "568tU9FMksJDxjkLBjWisSA4J4C5uPH87NCCkyREwrxe",
    blurb: "Community multisig vault funding builders",
  },
  {
    label: "Bridge collateral",
    address: "CL2JoQ5jdTpRNKshWhaTihuooT4qrKdLUiPsqKj3yAKz",
    blurb: "Hyperlane warp-route collateral pool",
  },
];

/** Relative, origin-proxied API bases (see vite.config.ts + vercel.json). */
export const API = {
  explorer: "/explorer-api",
  swap: "/swap-api",
  cookieboxAgg: "/agg-api",
} as const;

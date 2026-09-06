import { CHAIN } from "./config";

/** Minimal JSON-RPC client for Cookie Chain with timeout, retry and typed results. */
export class RpcError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = "RpcError";
  }
}

let idCounter = 1;

export async function rpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const { timeoutMs = 15_000, retries = 1 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(CHAIN.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: idCounter++, method, params }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new RpcError(`RPC HTTP ${res.status} on ${method}`);
      const json = await res.json();
      if (json.error) throw new RpcError(json.error.message ?? "RPC error", json.error.code);
      return json.result as T;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(600 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new RpcError(String(lastErr));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- typed shapes for what the app actually reads ----------

export interface EpochInfo {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight: number;
  transactionCount: number;
}

export interface PerfSample {
  numTransactions: number;
  numNonVoteTransactions: number;
  numSlots: number;
  samplePeriodSecs: number;
  slot: number;
}

export interface SignatureInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown | null;
  memo: string | null;
  confirmationStatus: "processed" | "confirmed" | "finalized" | null;
}

export interface TxDetail {
  slot: number;
  blockTime: number | null;
  meta: {
    fee: number;
    err: unknown | null;
    preBalances: number[];
    postBalances: number[];
    logMessages?: string[];
  } | null;
  transaction: {
    message: {
      accountKeys: { pubkey: string; signer: boolean; writable: boolean }[];
      instructions: { programIdIndex: number; accounts: number[]; data: string }[];
    };
  };
}

export interface TokenAccountParsed {
  pubkey: string;
  account: {
    data: {
      parsed: {
        info: {
          mint: string;
          tokenAmount: { uiAmount: number | null; decimals: number; amount: string };
          owner: string;
        };
      };
    };
  };
}

export interface AssetItem {
  id: string;
  content?: {
    json_metadata?: { name?: string; symbol?: string; image?: string };
    metadata?: { name?: string; symbol?: string };
    links?: { image?: string };
  };
  grouping?: { group_key: string; group_value: string }[];
  authorities?: { address: string }[];
  interface?: string;
  links?: { image?: string };
}

export const lamportsToCook = (lamports: number | string | null | undefined): number =>
  Number(lamports ?? 0) / 1e9;

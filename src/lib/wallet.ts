// Lightweight SVM wallet connector — Nightly first (the wallet Cookie Chain's docs
// recommend), plus Phantom / Backpack / Solflare / any standard-injection wallet.
// Deliberately no wallet-adapter framework: Nightly support on Cookie Chain is a
// plain standard Solana provider on the community RPC, and a hand-rolled adapter
// keeps the bundle small and the flow inspectable.

import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

export interface StandardProvider {
  isNightly?: boolean;
  publicKey?: PublicKey | Uint8Array | string | null;
  isConnected?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey | Uint8Array | string }>;
  disconnect: () => Promise<void>;
  on?: (event: "connect" | "disconnect" | "accountChanged", cb: (arg?: unknown) => void) => void;
  removeListener?: (event: string, cb: (arg?: unknown) => void) => void;
  signAndSendTransaction?: (
    tx: Transaction | VersionedTransaction,
    opts?: Record<string, unknown>,
  ) => Promise<{ signature: Uint8Array | string }>;
  signTransaction?: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signMessage?: (msg: Uint8Array, enc?: string) => Promise<{ signature: Uint8Array }>;
}

export interface DetectedWallet {
  id: string;
  name: string;
  icon: string;
  provider: StandardProvider;
  recommended?: boolean;
}

declare global {
  interface Window {
    nightly?: { solana?: StandardProvider };
    phantom?: { solana?: StandardProvider };
    backpack?: StandardProvider;
    solflare?: StandardProvider;
    solana?: StandardProvider;
  }
}

export function detectWallets(): DetectedWallet[] {
  const out: DetectedWallet[] = [];
  const push = (id: string, name: string, icon: string, p: StandardProvider | undefined, recommended = false) => {
    if (p && !out.some((w) => w.id === id)) out.push({ id, name, icon, provider: p, recommended });
  };
  push("nightly", "Nightly", "", window.nightly?.solana, true);
  push("phantom", "Phantom", "", window.phantom?.solana);
  push("backpack", "Backpack", "", window.backpack);
  push("solflare", "Solflare", "", window.solflare);
  // Generic standard-injection wallet that is none of the above.
  if (window.solana && !out.length) push("injected", "Browser wallet", "", window.solana);
  return out;
}

export function providerName(pk: StandardProvider): string {
  if (pk.isNightly) return "Nightly";
  return "wallet";
}

export function publicKeyOf(v: StandardProvider["publicKey"]): string | null {
  if (!v) return null;
  try {
    if (typeof v === "string") return v;
    if (v instanceof Uint8Array) return new PublicKey(v).toBase58();
    if (typeof (v as PublicKey).toBase58 === "function") return (v as PublicKey).toBase58();
    if (typeof (v as { toString(): string }).toString === "function") {
      const s = (v as unknown as { toString(): string }).toString();
      return s.startsWith("[object") ? null : s;
    }
  } catch {
    return null;
  }
  return null;
}

export function signatureOf(res: { signature: Uint8Array | string }): string {
  if (typeof res.signature === "string") return res.signature;
  try {
    return new PublicKey(res.signature).toBase58(); // not really base58 of a pubkey; use bs58 below
  } catch {
    return bytesToBase58(res.signature);
  }
}

// Small bs58 encoder to avoid pulling a dependency for one conversion.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function bytesToBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (let i = 0; bytes[i] === 0 && i < bytes.length - 1; i++) out += ALPHABET[0];
  for (let i = digits.length - 1; i >= 0; i--) out += ALPHABET[digits[i]];
  return out;
}

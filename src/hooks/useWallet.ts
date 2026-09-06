import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  DetectedWallet,
  StandardProvider,
  detectWallets,
  publicKeyOf,
  signatureOf,
} from "../lib/wallet";
import { rpc } from "../lib/rpc";

export interface WalletState {
  wallets: DetectedWallet[];
  provider: StandardProvider | null;
  walletName: string | null;
  address: string | null;
  connecting: boolean;
  error: string | null;
  balance: number | null; // COOK (lamports converted)
  balanceSlot: number | null;
  connect: (w: DetectedWallet) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  sendTransaction: (tx: Transaction | VersionedTransaction) => Promise<string>;
}

export function useWalletInternal(): WalletState {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [provider, setProvider] = useState<StandardProvider | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceSlot, setBalanceSlot] = useState<number | null>(null);

  const rescan = useCallback(() => setWallets(detectWallets()), []);
  useEffect(() => {
    rescan();
    const t = setInterval(rescan, 1500); // wallets inject asynchronously
    const stop = () => clearInterval(t);
    // stop scanning once we have at least one wallet and a stable set
    let stableCount = 0;
    const tick = setInterval(() => {
      if (wallets.length > 0 && ++stableCount > 4) stop();
    }, 1500);
    return () => {
      stop();
      clearInterval(tick);
    };
  }, [rescan]);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const res = await rpc<{ context: { slot: number }; value: number }>("getBalance", [address]);
      setBalance(res.value / 1e9);
      setBalanceSlot(res.context.slot);
    } catch {
      setBalance(null);
    }
  }, [address]);

  useEffect(() => {
    if (address) void refreshBalance();
  }, [address, refreshBalance]);

  const connect = useCallback(async (w: DetectedWallet) => {
    setConnecting(true);
    setError(null);
    try {
      const res = await w.provider.connect();
      const pk = publicKeyOf(res?.publicKey) ?? publicKeyOf(w.provider.publicKey);
      if (!pk) throw new Error("Wallet connected but returned no public key");
      setProvider(w.provider);
      setWalletName(w.name);
      setAddress(pk);
      try {
        w.provider.on?.("disconnect", () => {
          setProvider(null);
          setWalletName(null);
          setAddress(null);
        });
      } catch {
        /* optional */
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /unlock|lock/i.test(msg)
          ? `${w.name} is locked — unlock it and try again.`
          : msg || "Could not connect",
      );
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await provider?.disconnect();
    } catch {
      /* ignore */
    }
    setProvider(null);
    setWalletName(null);
    setAddress(null);
    setBalance(null);
  }, [provider]);

  const sendTransaction = useCallback(
    async (tx: Transaction | VersionedTransaction): Promise<string> => {
      if (!provider) throw new Error("No wallet connected");
      if (provider.signAndSendTransaction) {
        const res = await provider.signAndSendTransaction(tx);
        return signatureOf(res);
      }
      throw new Error(
        `${walletName ?? "This wallet"} does not support signAndSendTransaction — use a Nightly/Phantom-compatible wallet.`,
      );
    },
    [provider, walletName],
  );

  return useMemo(
    () => ({
      wallets,
      provider,
      walletName,
      address,
      connecting,
      error,
      balance,
      balanceSlot,
      connect,
      disconnect,
      refreshBalance,
      sendTransaction,
    }),
    [
      wallets,
      provider,
      walletName,
      address,
      connecting,
      error,
      balance,
      balanceSlot,
      connect,
      disconnect,
      refreshBalance,
      sendTransaction,
    ],
  );
}

export const WalletCtx = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWallet outside provider");
  return ctx;
}

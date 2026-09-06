import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { CHAIN, MEMO_PROGRAM } from "./config";
import { rpc, sleep } from "./rpc";

export const connection = new Connection(CHAIN.rpcUrl, "confirmed");

export type TxPhase = "signing" | "sending" | "processed" | "confirmed" | "finalized" | "failed";

export interface TxTrack {
  signature: string;
  phase: TxPhase;
  startedAt: number;
  phaseAt: Partial<Record<TxPhase, number>>; // epoch ms when each phase landed
  slots?: Partial<Record<"processed" | "confirmed" | "finalized", number>>;
  error?: string;
  kind: string;
}

/** Sign + send via the wallet provider, then poll status to time each confirmation stage. */
export async function sendAndTrack(
  wallet: { sendTransaction: (tx: Transaction) => Promise<string> },
  tx: Transaction,
  kind: string,
  onUpdate: (t: TxTrack) => void,
): Promise<TxTrack> {
  const t0 = performance.now();
  let signature: string;
  const track = (p: TxTrack["phase"], patch: Partial<TxTrack> = {}): TxTrack => ({
    signature: signature ?? "",
    phase: p,
    startedAt: t0,
    phaseAt: {},
    kind,
    ...patch,
  });

  onUpdate(track("signing"));
  // let the UI paint the "signing" state before the wallet modal opens
  await sleep(80);
  try {
    signature = await wallet.sendTransaction(tx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const friendly = /insufficient|0x1$/.test(msg)
      ? "Insufficient COOK for this transaction (amount + ~0.000005 COOK fee). Get faucet COOK below."
      : /User rejected|denied/i.test(msg)
        ? "Signature request rejected in wallet."
        : msg;
    const failed = track("failed", { error: friendly });
    onUpdate(failed);
    throw Object.assign(new Error(friendly), { track: failed });
  }
  const sent = track("sending", { signature, phaseAt: { signing: t0 } });
  sent.phaseAt.sending = performance.now();
  onUpdate(sent);

  // Poll until finalized (or ~45s cap). Cookie Chain finality is sub-second; polling at 400ms
  // captures processed -> confirmed -> finalized with real timings.
  const deadline = Date.now() + 45_000;
  let last: TxTrack = sent;
  while (Date.now() < deadline) {
    await sleep(400);
    try {
      const res = await rpc<{
        value: ({
          status?: { confirmationStatus?: string };
          confirmationStatus?: string;
          slot?: number;
          err: unknown | null;
        } | null)[];
      }>("getSignatureStatuses", [[[signature], { searchTransactionHistory: true }]]);
      const st = res.value?.[0];
      if (!st) continue;
      if (st.err) {
        const failed: TxTrack = {
          ...last,
          phase: "failed",
          error: "Transaction failed on-chain (rejected by the program or block limits).",
        };
        failed.phaseAt.failed = performance.now();
        onUpdate(failed);
        return failed;
      }
      const status = st.confirmationStatus ?? st.status?.confirmationStatus;
      if (status === "processed" && last.phase === "sending") {
        last = { ...last, phase: "processed", slots: { processed: st.slot } };
        last.phaseAt.processed = performance.now();
        last.slots = { ...last.slots, processed: st.slot };
        onUpdate(last);
      } else if (status === "confirmed" && (last.phase === "sending" || last.phase === "processed")) {
        last = { ...last, phase: "confirmed", slots: { ...last.slots, confirmed: st.slot } };
        last.phaseAt.confirmed = performance.now();
        onUpdate(last);
      } else if (status === "finalized" && last.phase !== "finalized" && last.phase !== "failed") {
        last = { ...last, phase: "finalized", slots: { ...last.slots, finalized: st.slot } };
        last.phaseAt.finalized = performance.now();
        onUpdate(last);
        return last;
      }
    } catch {
      /* transient RPC hiccup — keep polling */
    }
  }
  return last;
}

export function elapsedMs(t: TxTrack, phase: TxPhase): number | null {
  const at = t.phaseAt[phase];
  return at === undefined ? null : Math.max(0, Math.round(at - t.startedAt));
}

/** Memo "ping" — cheapest possible real transaction (memo program + fee only). */
export async function buildMemoTx(owner: string, memo: string): Promise<Transaction> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction({ feePayer: new PublicKey(owner), blockhash, lastValidBlockHeight }).add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 2_000 }),
    new TransactionInstruction({
      keys: [{ pubkey: new PublicKey(owner), isSigner: true, isWritable: false }],
      programId: new PublicKey(MEMO_PROGRAM),
      data: Buffer.from(memo, "utf8"),
    }),
  );
  return tx;
}

/** Plain COOK transfer between two wallet addresses. */
export async function buildCookTransferTx(
  owner: string,
  destination: string,
  amountCook: number,
): Promise<Transaction> {
  let dest: PublicKey;
  try {
    dest = new PublicKey(destination);
  } catch {
    throw new Error("Destination is not a valid Cookie Chain address.");
  }
  const lamports = Math.round(amountCook * 1e9);
  if (!Number.isFinite(lamports) || lamports <= 0) throw new Error("Enter a positive COOK amount.");
  if (lamports < 1) throw new Error("Amount is smaller than 1 lamport (1e-9 COOK).");
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
  return new Transaction({ feePayer: new PublicKey(owner), blockhash, lastValidBlockHeight }).add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(owner),
      toPubkey: dest,
      lamports,
    }),
  );
}

import type { ClusterId } from "../config";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isAddress = (v: string) => BASE58.test(v.trim());
export const isSignature = (v: string) => /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(v.trim());
export const WSOL = "So11111111111111111111111111111111111111112";
export const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

const q = (c: ClusterId) => (c === "devnet" ? "?cluster=devnet" : "");
export const solscanToken = (mint: string, c: ClusterId = "mainnet-beta") => `https://solscan.io/token/${encodeURIComponent(mint)}${q(c)}`;
export const solscanTx = (sig: string, c: ClusterId) => `https://solscan.io/tx/${encodeURIComponent(sig)}${q(c)}`;
export const dexscreenerToken = (mint: string) => `https://dexscreener.com/solana/${encodeURIComponent(mint)}`;
export const raydiumSwap = (mint: string) => `https://raydium.io/swap/?inputMint=sol&outputMint=${encodeURIComponent(mint)}`;
export const raydiumLaunchToken = (mint: string) => `https://raydium.io/launchpad/token/?mint=${encodeURIComponent(mint)}`;

export type TxCheck = { signature: string; ok: boolean; status: string; slot?: number; blockTime?: number | null; feeLamports?: number; programs: string[]; error?: string };

type Conn = {
  getSignatureStatuses: (s: string[], c?: { searchTransactionHistory: boolean }) => Promise<{ value: ({ confirmationStatus?: string; err: unknown; slot: number } | null)[] }>;
  getTransaction: (s: string, c: { maxSupportedTransactionVersion: number; commitment: "confirmed" | "finalized" }) => Promise<any>;
};

/** Reads a signature back from the cluster: status, slot, fee, error and the programs it invoked. */
export async function verifyTransaction(connection: Conn, signature: string): Promise<TxCheck> {
  const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
  const st = value[0];
  if (!st) return { signature, ok: false, status: "Not found on this network", programs: [] };
  const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null);
  const keys: string[] = tx ? tx.transaction.message.staticAccountKeys?.map((k: any) => k.toBase58()) ?? tx.transaction.message.accountKeys?.map((k: any) => k.toBase58()) ?? [] : [];
  const ixs: any[] = tx ? tx.transaction.message.compiledInstructions ?? tx.transaction.message.instructions ?? [] : [];
  const programs = [...new Set(ixs.map((i) => keys[i.programIdIndex]).filter(Boolean))];
  const err = st.err ?? tx?.meta?.err ?? null;
  return {
    signature, ok: !err, status: err ? "Failed" : st.confirmationStatus === "finalized" ? "Finalized" : st.confirmationStatus === "confirmed" ? "Confirmed" : "Processed",
    slot: st.slot, blockTime: tx?.blockTime ?? null, feeLamports: tx?.meta?.fee, programs, error: err ? JSON.stringify(err) : undefined,
  };
}

/** Wallet errors read as one plain line. */
export function walletErrorText(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(m)) return "You declined the request in your wallet. Nothing was sent.";
  if (/insufficient|0x1\b|lamports/i.test(m)) return "Not enough SOL for this transaction and its fees.";
  if (/blockhash|expired/i.test(m)) return "The transaction expired before it was confirmed. Try again.";
  return m.length > 180 ? `${m.slice(0, 177)}…` : m;
}

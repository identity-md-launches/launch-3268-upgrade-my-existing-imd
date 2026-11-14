import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useNetwork } from "../wallet/SolanaProvider";
import { DEV_ALLOCATION_PERCENT } from "../lib/plan";
import { TOKEN_DECIMALS, fromUnits } from "../lib/launchParams";
import { verifyTransaction, walletErrorText, type TxCheck } from "../lib/solana";
import type { DevAllocation as Alloc } from "../lib/launchlab";
import { TxList } from "./LaunchForm";

/**
 * The creator's 1% vesting record, read from Solana. "Allocated" only once the record names the connected
 * wallet for the full reserved amount; otherwise it says pending and offers the one approval that completes it.
 */
export function DevAllocation({ mint, autoStart = false }: { mint: string; autoStart?: boolean }) {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, connected } = useWallet();
  const { cluster } = useNetwork();
  const [alloc, setAlloc] = useState<Alloc | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [check, setCheck] = useState<TxCheck | null>(null);
  const started = useRef(false);

  const refresh = useCallback(async () => {
    if (!publicKey) return undefined;
    const { readDevAllocation } = await import("../lib/launchlab");
    const a = await readDevAllocation(connection, cluster, mint, publicKey);
    setAlloc(a);
    return a;
  }, [connection, cluster, mint, publicKey]);

  const complete = useCallback(async () => {
    if (!publicKey || !signAllTransactions) return;
    setBusy(true); setErr("");
    try {
      const { allocateDeveloper } = await import("../lib/launchlab");
      const sig = await allocateDeveloper(connection, cluster, publicKey, signAllTransactions, mint);
      setCheck(await verifyTransaction(connection, sig));
    } catch (e) { setErr(walletErrorText(e)); }
    try { await refresh(); } catch { /* the pending state stays, with its button */ }
    setBusy(false);
  }, [connection, cluster, mint, publicKey, signAllTransactions, refresh]);

  useEffect(() => {
    refresh()
      .then((a) => { if (autoStart && !started.current && a?.status === "pending") { started.current = true; complete(); } })
      .catch((e) => setErr(`Could not read the developer allocation: ${walletErrorText(e)}`));
  }, [refresh, autoStart, complete]);

  if (!publicKey) return null;
  return (
    <div className="dev-alloc" aria-live="polite">
      {alloc === undefined && !err && <p className="hint" role="status">Reading the developer allocation from Solana…</p>}
      {alloc === null && <p className="hint">No LaunchLab pool found for this token yet, so nothing is reserved.</p>}
      {alloc?.status === "allocated" && (
        <>
          <p className="status status-approved"><span aria-hidden="true">✓</span> {DEV_ALLOCATION_PERCENT}% developer allocation assigned to your wallet, verified on chain</p>
          <dl className="facts">
            <div><dt>Allocated to you</dt><dd className="num">{fromUnits(alloc.recordShare, TOKEN_DECIMALS)} tokens, vesting on the schedule set at launch once the token graduates</dd></div>
            <div><dt>Vesting record</dt><dd className="mint">{alloc.record}</dd></div>
          </dl>
        </>
      )}
      {alloc?.status === "pending" && (
        <>
          <p className="status status-changes"><span aria-hidden="true">!</span> {DEV_ALLOCATION_PERCENT}% reserved; developer allocation pending</p>
          <p className="hint">LaunchLab holds {fromUnits(alloc.reserved, TOKEN_DECIMALS)} tokens for the creator, but no vesting record names your wallet yet. One more approval assigns them to you.</p>
          <div className="actions">
            <button type="button" className="button button-primary" disabled={!connected || busy} onClick={complete}>{busy ? "Approve in your wallet…" : "Complete developer allocation"}</button>
          </div>
        </>
      )}
      {check && <TxList checks={[check]} />}
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}

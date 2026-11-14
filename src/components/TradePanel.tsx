import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Field } from "./Field";
import { TxList } from "./LaunchForm";
import { MarketCard } from "./Watchlist";
import { useNetwork } from "../wallet/SolanaProvider";
import { CLUSTERS } from "../config";
import { isAddress, raydiumSwap, verifyTransaction, walletErrorText, type TxCheck } from "../lib/solana";
import { TOKEN_DECIMALS, toUnits, fromUnits } from "../lib/launchParams";
import type { CurveState } from "../lib/launchlab";

const POLL_MS = 15000;
const sol = (v: number, d = 4) => `${v.toLocaleString("en-US", { maximumFractionDigits: d })} SOL`;

/** Price samples read from the curve while this page is open: a real, session-length chart. */
export function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <p className="hint">The chart fills in as new on-chain readings arrive every 15 seconds.</p>;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || max || 1;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * 100},${36 - ((p - min) / span) * 32 - 2}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label={`Price over ${points.length} readings, from ${min.toPrecision(3)} to ${max.toPrecision(3)} SOL`}>
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function TradePanel({ mint: preset }: { mint: string }) {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, connected } = useWallet();
  const { cluster } = useNetwork();
  const [input, setInput] = useState(preset);
  const [mint, setMint] = useState(preset);
  const [err, setErr] = useState("");
  const [curve, setCurve] = useState<CurveState | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slip, setSlip] = useState("1");
  const [tradeErr, setTradeErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [checks, setChecks] = useState<TxCheck[]>([]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const gen = useRef(0);

  useEffect(() => { if (preset) { setInput(preset); setMint(preset); } }, [preset]);

  useEffect(() => {
    if (!mint) return;
    const g = ++gen.current;
    setCurve(undefined); setHistory([]); setLoading(true); setErr("");
    let timer: number | undefined;
    const tick = async () => {
      try {
        const { readCurve } = await import("../lib/launchlab");
        const c = await readCurve(connection, cluster, mint);
        if (g !== gen.current) return;
        setCurve(c);
        if (c) setHistory((h) => [...h.slice(-59), c.priceSol]);
      } catch (e) { if (g === gen.current) setErr(`Could not read the curve: ${walletErrorText(e)}`); }
      finally { if (g === gen.current) setLoading(false); }
      if (g === gen.current && document.visibilityState !== "hidden") timer = window.setTimeout(tick, POLL_MS);
      else if (g === gen.current) timer = window.setTimeout(tick, POLL_MS * 2);
    };
    tick();
    return () => { gen.current++; if (timer) clearTimeout(timer); };
  }, [mint, cluster, connection]);

  useEffect(() => {
    if (!publicKey || !mint) { setBalance(null); return; }
    import("../lib/launchlab").then(({ tokenBalance }) => tokenBalance(connection, publicKey, mint)).then(setBalance).catch(() => setBalance(null));
  }, [publicKey, mint, connection, checks.length]);

  function load(e: FormEvent) {
    e.preventDefault();
    if (!isAddress(input)) { setErr("Paste a Solana mint address: 32 to 44 letters and digits, without 0, O, I or l."); return; }
    setMint(input.trim());
  }
  async function trade(e: FormEvent) {
    e.preventDefault();
    const a = Number(amount), s = Number(slip);
    if (!Number.isFinite(a) || a <= 0) { setTradeErr(side === "buy" ? "Enter how much SOL to spend." : "Enter how many tokens to sell."); return; }
    if (!Number.isFinite(s) || s <= 0 || s > 50) { setTradeErr("Enter slippage above 0% and up to 50%."); return; }
    if (!publicKey || !signAllTransactions) return;
    setTradeErr(""); setBusy(true);
    try {
      const { tradeCurve } = await import("../lib/launchlab");
      const units = toUnits(amount, side === "buy" ? 9 : TOKEN_DECIMALS);
      if (side === "sell" && balance !== null && units > balance) throw new Error(`You hold ${fromUnits(balance, TOKEN_DECIMALS)} tokens.`);
      const sig = await tradeCurve(connection, cluster, publicKey, signAllTransactions, mint, side, units, BigInt(Math.round(s * 100)));
      const check = await verifyTransaction(connection, sig);
      setChecks((c) => [check, ...c]); setAmount("");
    } catch (er) { setTradeErr(walletErrorText(er)); }
    finally { setBusy(false); }
  }

  const trading = curve && curve.status === 0;
  return (
    <div className="trade card">
      <form className="watch-form" onSubmit={load} noValidate>
        <Field id="trade-mint" label="Token mint address" className="mono-input" spellCheck={false} autoCapitalize="none" value={input} onChange={(e) => { setInput(e.target.value); setErr(""); }} error={err} />
        <button type="submit" className="button">Load token</button>
      </form>
      {!mint && <p className="empty">Load a LaunchLab token to see its bonding curve and trade it. Tokens you launch here load automatically.</p>}
      {mint && loading && curve === undefined && <p className="hint" role="status">Reading the curve from Solana {CLUSTERS[cluster].label}…</p>}
      {mint && curve === null && (
        <div className="stack">
          <p className="empty">No LaunchLab curve for this mint on {CLUSTERS[cluster].label}. If it already trades in a pool, use Raydium or the market data below.</p>
          <div className="actions"><a className="button button-small" href={raydiumSwap(mint)} target="_blank" rel="noopener noreferrer">Trade on Raydium</a></div>
        </div>
      )}
      {curve && (
        <div className="trade-grid">
          <div className="stack">
            <dl className="stats">
              <div><dt>Price</dt><dd className="num">{curve.priceSol.toPrecision(4)} SOL</dd></div>
              <div><dt>Market cap</dt><dd className="num">{sol(curve.marketCapSol, 2)}</dd></div>
              <div><dt>Raised on curve</dt><dd className="num">{sol(curve.raisedSol)}</dd></div>
              <div><dt>Status</dt><dd>{curve.statusText}</dd></div>
            </dl>
            <div>
              <p className="hint num">Graduation: {sol(curve.raisedSol, 2)} of {sol(curve.targetSol, 2)} ({(curve.progress * 100).toFixed(1)}%)</p>
              <p className="progress" aria-hidden="true"><span style={{ inlineSize: `${curve.progress * 100}%` }} /></p>
            </div>
            <Sparkline points={history} />
          </div>
          <form className="stack" onSubmit={trade} noValidate aria-label="Trade on the bonding curve">
            <fieldset className="segmented">
              <legend className="visually-hidden">Side</legend>
              {(["buy", "sell"] as const).map((s) => (
                <label key={s} className="segment"><input type="radio" name="side" checked={side === s} onChange={() => { setSide(s); setTradeErr(""); }} /><span>{s === "buy" ? "Buy" : "Sell"}</span></label>
              ))}
            </fieldset>
            <Field id="trade-amount" label={side === "buy" ? "SOL to spend" : "Tokens to sell"} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} hint={balance !== null ? `You hold ${fromUnits(balance, TOKEN_DECIMALS)} tokens.` : undefined} />
            <Field id="trade-slip" label="Slippage (%)" inputMode="decimal" value={slip} onChange={(e) => setSlip(e.target.value)} />
            <button type="submit" className="button button-primary" disabled={!connected || !trading || busy}>{busy ? "Approve in your wallet…" : side === "buy" ? "Buy on the curve" : "Sell on the curve"}</button>
            {!connected && <p className="hint">Connect a Solana wallet to trade.</p>}
            {curve.status !== 0 && <p className="hint">This curve has graduated; trade in its Raydium pool.</p>}
            {tradeErr && <p className="error" role="alert">{tradeErr}</p>}
          </form>
        </div>
      )}
      {checks.length > 0 && <TxList checks={checks} />}
      {mint && cluster === "mainnet-beta" && <MarketCard mint={mint} />}
    </div>
  );
}

export function TxVerify() {
  const { connection } = useConnection();
  const { cluster } = useNetwork();
  const [sig, setSig] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TxCheck | null>(null);
  async function check(e: FormEvent) {
    e.preventDefault();
    if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(sig.trim())) { setErr("Paste a transaction signature: 64 to 90 letters and digits."); return; }
    setErr(""); setBusy(true); setResult(null);
    try { setResult(await verifyTransaction(connection, sig.trim())); } catch (er) { setErr(walletErrorText(er)); } finally { setBusy(false); }
  }
  return (
    <div className="card stack">
      <form className="watch-form" onSubmit={check} noValidate>
        <Field id="verify-sig" label={`Transaction signature (${CLUSTERS[cluster].label})`} className="mono-input" spellCheck={false} autoCapitalize="none" value={sig} onChange={(e) => setSig(e.target.value)} error={err} />
        <button type="submit" className="button" disabled={busy}>{busy ? "Checking…" : "Verify"}</button>
      </form>
      {result && (
        <>
          <TxList checks={[result]} />
          {result.programs.length > 0 && <p className="hint">Programs called: <span className="mint">{result.programs.join(", ")}</span></p>}
        </>
      )}
    </div>
  );
}

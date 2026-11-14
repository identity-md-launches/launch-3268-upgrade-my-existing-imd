import { useEffect, useState, type FormEvent } from "react";
import { WSOL, dexscreenerToken, isAddress, raydiumSwap, solscanToken } from "../lib/solana";
import { fetchMarket, usd, type MarketStats } from "../lib/market";

export type Watch = { mint: string; label: string };
const KEY = "imd-launchpad:watchlist";
export function loadWatchlist(): Watch[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter((w) => w && isAddress(w.mint)) : []; } catch { return []; }
}
export function saveWatchlist(w: Watch[]) { try { localStorage.setItem(KEY, JSON.stringify(w)); } catch { /* storage unavailable */ } }

/** Live market data and chart from DexScreener for a mainnet token. */
export function MarketCard({ mint }: { mint: string }) {
  const [data, setData] = useState<MarketStats | null | undefined>(undefined);
  const [err, setErr] = useState("");
  const [chart, setChart] = useState(false);
  useEffect(() => {
    const ac = new AbortController();
    let t: number | undefined;
    const run = () => fetchMarket(mint, ac.signal).then((d) => { setData(d); setErr(""); }).catch((e) => { if (!ac.signal.aborted) setErr(String(e.message ?? e)); }).finally(() => { if (!ac.signal.aborted) t = window.setTimeout(run, 30000); });
    run();
    return () => { ac.abort(); if (t) clearTimeout(t); };
  }, [mint]);
  if (err) return <p className="hint hint-warn">Market data unavailable: {err}</p>;
  if (data === undefined) return <p className="hint" role="status">Loading market data…</p>;
  if (data === null) return <p className="hint">DexScreener has no Solana pair for this token yet. Tokens on a bonding curve appear after they trade in a pool.</p>;
  return (
    <div className="market stack">
      <dl className="stats">
        <div><dt>Price</dt><dd className="num">{usd(data.priceUsd)}{data.change24h !== null ? ` (${data.change24h > 0 ? "+" : ""}${data.change24h}% 24h)` : ""}</dd></div>
        <div><dt>Liquidity</dt><dd className="num">{usd(data.liquidityUsd)}</dd></div>
        <div><dt>Volume 24h</dt><dd className="num">{usd(data.volume24h)}</dd></div>
        <div><dt>Market cap</dt><dd className="num">{usd(data.marketCap ?? data.fdv)}</dd></div>
      </dl>
      <div className="actions">
        <button type="button" className="button button-small" aria-expanded={chart} onClick={() => setChart((c) => !c)}>{chart ? "Hide chart" : "Show live chart"}</button>
        <a className="button button-small button-quiet" href={data.pairUrl} target="_blank" rel="noopener noreferrer">Open on DexScreener</a>
      </div>
      {chart && <iframe className="chart" title="Live chart from DexScreener" src={`https://dexscreener.com/solana/${encodeURIComponent(data.pairAddress)}?embed=1&theme=dark&info=0&trades=0`} loading="lazy" />}
    </div>
  );
}

export function Watchlist({ items, onChange, onTrade }: { items: Watch[]; onChange: (w: Watch[]) => void; onTrade: (mint: string) => void }) {
  const [mint, setMint] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  function add(e: FormEvent) {
    e.preventDefault();
    const m = mint.trim();
    if (!isAddress(m)) { setErr("Paste a Solana mint address: 32 to 44 letters and digits, without 0, O, I or l."); document.getElementById("mint")?.focus(); return; }
    if (items.some((w) => w.mint === m)) { setErr("This token is already on your watchlist."); document.getElementById("mint")?.focus(); return; }
    const l = label.trim() || `Token ${items.length + 1}`;
    onChange([{ mint: m, label: l }, ...items]); setMint(""); setLabel(""); setErr(""); setMsg(`${l} added to your watchlist.`);
  }
  return (
    <div className="watchlist card">
      <form className="watch-form" onSubmit={add} noValidate>
        <div className="field field-grow">
          <label htmlFor="mint">Solana mint address</label>
          <input id="mint" className="mono-input" autoComplete="off" spellCheck={false} autoCapitalize="none" value={mint} onChange={(e) => setMint(e.target.value)} aria-invalid={err ? true : undefined} aria-describedby={err ? "mint-error mint-hint" : "mint-hint"} />
        </div>
        <div className="field">
          <label htmlFor="mint-label">Label (optional)</label>
          <input id="mint-label" autoComplete="off" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <button type="submit" className="button">Add to watchlist</button>
      </form>
      <p id="mint-hint" className="hint">Saved in this browser only. Not sure where to start? <button type="button" className="link-button" onClick={() => { setMint(WSOL); setLabel("Wrapped SOL"); setErr(""); }}>Fill in wrapped SOL</button></p>
      {err && <p id="mint-error" className="error">{err}</p>}
      <p className="visually-hidden" role="status">{msg}</p>
      {items.length === 0 ? (
        <p className="empty">No tokens on your watchlist yet. Add a mint address to get live market data, a chart and trade links in one place.</p>
      ) : (
        <ul className="watch-list">
          {items.map((w) => (
            <li key={w.mint} className="watch-item">
              <div className="watch-id"><h3>{w.label}</h3><p className="mint">{w.mint}</p></div>
              <div className="actions">
                <button type="button" className="button button-small" aria-expanded={open === w.mint} onClick={() => setOpen(open === w.mint ? null : w.mint)}>{open === w.mint ? "Hide market data" : "Market data"}<span className="visually-hidden"> for {w.label}</span></button>
                <button type="button" className="button button-small" onClick={() => onTrade(w.mint)}>Trade on the curve<span className="visually-hidden"> {w.label}</span></button>
                <a className="button button-small button-quiet" href={dexscreenerToken(w.mint)} target="_blank" rel="noopener noreferrer">DexScreener</a>
                <a className="button button-small button-quiet" href={raydiumSwap(w.mint)} target="_blank" rel="noopener noreferrer">Raydium</a>
                <a className="button button-small button-quiet" href={solscanToken(w.mint)} target="_blank" rel="noopener noreferrer">Solscan</a>
                <button type="button" className="button button-small button-quiet" onClick={() => { onChange(items.filter((x) => x.mint !== w.mint)); setMsg(`${w.label} removed from your watchlist.`); }}>Remove<span className="visually-hidden"> {w.label}</span></button>
              </div>
              {open === w.mint && <MarketCard mint={w.mint} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

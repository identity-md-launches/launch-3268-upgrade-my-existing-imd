import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Field } from "./Field";
import { DevAllocation } from "./DevAllocation";
import { useNetwork } from "../wallet/SolanaProvider";
import { CLUSTERS, type ClusterId } from "../config";
import { DEV_ALLOCATION_PERCENT, MAX_INITIAL_BUY_SOL } from "../lib/plan";
import { EMPTY_LAUNCH, MAX_LOGO_BYTES, TOKEN_DECIMALS, fromUnits, launchNumbers, metadataJson, validateLaunch, type LaunchErrors, type LaunchForm as Form } from "../lib/launchParams";
import { solscanToken, solscanTx, verifyTransaction, walletErrorText, type TxCheck } from "../lib/solana";

type Stage = { kind: "edit" } | { kind: "review" } | { kind: "signing" } | { kind: "done"; mint: string; poolId: string; checks: TxCheck[]; poolOnChain: boolean } | { kind: "failed"; message: string };
const ORDER: (keyof LaunchErrors)[] = ["name", "symbol", "supply", "description", "logo", "logoUrl", "website", "x", "telegram", "metadataUri", "fundraiseSol", "sellPercent", "cliffDays", "unlockDays", "initialBuySol", "slippagePercent"];

export function LaunchForm({ draft, onLaunched }: { draft: Partial<Form> | null; onLaunched: (mint: string, label: string, cluster: ClusterId) => void }) {
  const [f, setF] = useState<Form>(EMPTY_LAUNCH);
  const [errors, setErrors] = useState<LaunchErrors>({});
  const [logo, setLogo] = useState<{ url: string; name: string } | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: "edit" });
  const formRef = useRef<HTMLFormElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, connected } = useWallet();
  const { cluster } = useNetwork();

  useEffect(() => { if (draft) { setF((s) => ({ ...s, ...draft })); setStage({ kind: "edit" }); setErrors({}); } }, [draft]);
  useEffect(() => { if (stage.kind !== "edit") reviewRef.current?.focus(); }, [stage.kind]);
  useEffect(() => () => { if (logo) URL.revokeObjectURL(logo.url); }, [logo]);

  const set = (k: keyof Form) => (e: { target: { value: string } }) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => (s[k] ? { ...s, [k]: undefined } : s)); };
  // Integer amounts exist only for a validated form: while editing, fields are raw strings that may not parse.
  const n = stage.kind === "review" || stage.kind === "signing" ? launchNumbers(f) : null;

  function onLogo(file: File | undefined) {
    if (!file) { setLogo(null); return; }
    if (!/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(file.type)) { setErrors((s) => ({ ...s, logo: "Use a PNG, JPG, GIF, WebP or SVG image." })); return; }
    if (file.size > MAX_LOGO_BYTES) { setErrors((s) => ({ ...s, logo: "Use an image under 1 MB." })); return; }
    setErrors((s) => ({ ...s, logo: undefined }));
    setLogo({ url: URL.createObjectURL(file), name: file.name });
  }
  function downloadMetadata() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(metadataJson(f), null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `${(f.symbol || "token").toLowerCase()}-metadata.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function review(e: FormEvent) {
    e.preventDefault();
    const errs = { ...validateLaunch(f), ...(errors.logo ? { logo: errors.logo } : {}) };
    setErrors(errs);
    const first = ORDER.find((k) => errs[k]);
    if (first) { formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus(); return; }
    setStage({ kind: "review" });
  }
  async function sign() {
    if (!publicKey || !signAllTransactions) return;
    setStage({ kind: "signing" });
    try {
      const { createLaunch } = await import("../lib/launchlab");
      const res = await createLaunch(connection, cluster, publicKey, signAllTransactions, f);
      const checks = await Promise.all(res.txIds.map((s) => verifyTransaction(connection, s)));
      const pool = await connection.getAccountInfo(new PublicKey(res.poolId));
      setStage({ kind: "done", mint: res.mint, poolId: res.poolId, checks, poolOnChain: !!pool });
      if (pool && checks.every((c) => c.ok)) onLaunched(res.mint, `${f.name.trim()} (${f.symbol.trim().toUpperCase()})`, cluster);
    } catch (err) {
      setStage({ kind: "failed", message: walletErrorText(err) });
    }
  }

  if (stage.kind !== "edit") {
    return (
      <div className="launch card" aria-live="polite">
        <h3 ref={reviewRef} tabIndex={-1}>
          {stage.kind === "review" ? "Review before you sign" : stage.kind === "signing" ? "Waiting for your wallet" : stage.kind === "done" ? "Launch submitted and checked" : "The launch did not go through"}
        </h3>
        {n && (
          <>
            <dl className="facts">
              <div><dt>Network</dt><dd>Solana {CLUSTERS[cluster].label}</dd></div>
              <div><dt>Token</dt><dd>{f.name.trim()}, ${f.symbol.trim().toUpperCase()}, {TOKEN_DECIMALS} decimals</dd></div>
              <div><dt>Total supply</dt><dd className="num">{fromUnits(n.supply, TOKEN_DECIMALS)}</dd></div>
              <div><dt>Sold on the bonding curve</dt><dd className="num">{fromUnits(n.totalSellA, TOKEN_DECIMALS)}</dd></div>
              <div><dt>Developer allocation ({DEV_ALLOCATION_PERCENT}%)</dt><dd className="num">{fromUnits(n.totalLockedAmount, TOKEN_DECIMALS)} reserved at creation, then assigned to your wallet by a second approval. Vesting after graduation: {f.cliffDays || 0} day cliff, then {f.unlockDays || 0} days</dd></div>
              <div><dt>Seeds the Raydium pool</dt><dd className="num">{fromUnits(n.migrateAmount, TOKEN_DECIMALS)} ({f.migrateType === "cpmm" ? "CPMM" : "AMM v4"} pool)</dd></div>
              <div><dt>Graduation target</dt><dd className="num">{fromUnits(n.totalFundRaisingB, 9)} SOL</dd></div>
              <div><dt>Developer initial purchase</dt><dd className="num">{n.buyLamports > 0n ? `${fromUnits(n.buyLamports, 9)} SOL from your wallet, ${f.slippagePercent}% slippage` : "None"}</dd></div>
              <div><dt>Metadata</dt><dd className="mint">{f.metadataUri.trim()}</dd></div>
              <div><dt>Creator wallet</dt><dd className="mint">{publicKey ? publicKey.toBase58() : "Connect a wallet first"}</dd></div>
            </dl>
            <p className="hint">Your wallet asks twice: first to create the token{n.buyLamports > 0n ? " with your first buy" : ""}, then to assign the {DEV_ALLOCATION_PERCENT}% to you. It shows each transaction before anything is sent. Network fees and LaunchLab's fees apply; the site takes nothing and holds no keys.</p>
            <div className="actions">
              <button type="button" className="button button-primary" disabled={!connected || stage.kind === "signing"} onClick={sign}>{stage.kind === "signing" ? "Approve in your wallet…" : "Sign and launch"}</button>
              <button type="button" className="button button-quiet" disabled={stage.kind === "signing"} onClick={() => setStage({ kind: "edit" })}>Edit settings</button>
            </div>
            {!connected && <p className="hint hint-warn">Connect a Solana wallet from the top of the page to sign.</p>}
          </>
        )}
        {stage.kind === "done" && (
          <>
            <p>{stage.poolOnChain ? "The LaunchLab pool account exists on chain and trading is open on the bonding curve." : "The pool account was not found yet. Check the transactions below."}</p>
            <dl className="facts">
              <div><dt>Mint address</dt><dd className="mint"><a href={solscanToken(stage.mint, cluster)} target="_blank" rel="noopener noreferrer">{stage.mint}</a></dd></div>
              <div><dt>LaunchLab pool</dt><dd className="mint">{stage.poolId}</dd></div>
            </dl>
            <TxList checks={stage.checks} />
            {stage.poolOnChain && <><h4 className="subhead">Developer allocation</h4><DevAllocation mint={stage.mint} autoStart /></>}
            <div className="actions">
              <a className="button button-primary" href="#trade">Trade it</a>
              <button type="button" className="button button-quiet" onClick={() => { setF(EMPTY_LAUNCH); setStage({ kind: "edit" }); }}>Launch another</button>
            </div>
          </>
        )}
        {stage.kind === "failed" && (
          <>
            <p className="error" role="alert">{stage.message}</p>
            <div className="actions"><button type="button" className="button" onClick={() => setStage({ kind: "review" })}>Back to review</button></div>
          </>
        )}
      </div>
    );
  }

  return (
    <form ref={formRef} className="launch card" onSubmit={review} noValidate aria-label="Create a token on Raydium LaunchLab">
      <fieldset className="form-group">
        <legend>Token</legend>
        <div className="grid-2">
          <Field id="name" label="Token name" value={f.name} onChange={set("name")} error={errors.name} maxLength={40} />
          <Field id="symbol" label="Symbol" value={f.symbol} onChange={set("symbol")} error={errors.symbol} autoCapitalize="characters" spellCheck={false} />
          <Field id="supply" label="Total supply" inputMode="numeric" value={f.supply} onChange={set("supply")} error={errors.supply} hint="From 10 million to 1 trillion, 6 decimals." />
          <div className="field">
            <label htmlFor="logo">Logo</label>
            <div className="logo-row">
              {logo ? <img className="logo-preview" src={logo.url} alt={`Preview of ${logo.name}`} width={44} height={44} /> : <span className="logo-preview" aria-hidden="true" />}
              <input id="logo" data-field="logo" type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" onChange={(e) => onLogo(e.target.files?.[0])} aria-invalid={errors.logo ? true : undefined} aria-describedby={errors.logo ? "logo-error logo-hint" : "logo-hint"} />
            </div>
            <p id="logo-hint" className="hint">Preview only. Host the image, then paste its link below.</p>
            {errors.logo && <p id="logo-error" className="error">{errors.logo}</p>}
          </div>
        </div>
      </fieldset>
      <fieldset className="form-group">
        <legend>Metadata</legend>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" data-field="description" rows={3} value={f.description} onChange={set("description")} aria-invalid={errors.description ? true : undefined} aria-describedby={errors.description ? "description-error" : undefined} />
          {errors.description && <p id="description-error" className="error">{errors.description}</p>}
        </div>
        <div className="grid-2">
          <Field id="logoUrl" label="Logo link" placeholder="https:// or ipfs://" value={f.logoUrl} onChange={set("logoUrl")} error={errors.logoUrl} spellCheck={false} />
          <Field id="website" label="Website" placeholder="https://" value={f.website} onChange={set("website")} error={errors.website} spellCheck={false} />
          <Field id="x" label="X profile" placeholder="https://x.com/" value={f.x} onChange={set("x")} error={errors.x} spellCheck={false} />
          <Field id="telegram" label="Telegram" placeholder="https://t.me/" value={f.telegram} onChange={set("telegram")} error={errors.telegram} spellCheck={false} />
        </div>
        <div className="field-head">
          <p className="hint">The token points at one metadata file. Download it, host it on IPFS or Arweave, then paste its link.</p>
          <button type="button" className="button button-small" onClick={downloadMetadata}>Download metadata file</button>
        </div>
        <Field id="metadataUri" label="Metadata link" placeholder="ipfs://… or https://…" className="mono-input" value={f.metadataUri} onChange={set("metadataUri")} error={errors.metadataUri} spellCheck={false} />
      </fieldset>
      <fieldset className="form-group">
        <legend>Launch settings</legend>
        <div className="grid-2">
          <Field id="fundraiseSol" label="Graduation target (SOL)" inputMode="decimal" value={f.fundraiseSol} onChange={set("fundraiseSol")} error={errors.fundraiseSol} hint="SOL raised on the curve before liquidity moves to Raydium." />
          <Field id="sellPercent" label="Sold on the curve (%)" inputMode="decimal" value={f.sellPercent} onChange={set("sellPercent")} error={errors.sellPercent} hint={`${DEV_ALLOCATION_PERCENT}% is the developer allocation; the rest seeds the pool.`} />
          <Field id="cliffDays" label="Developer cliff (days)" inputMode="numeric" value={f.cliffDays} onChange={set("cliffDays")} error={errors.cliffDays} />
          <Field id="unlockDays" label="Developer unlock period (days)" inputMode="numeric" value={f.unlockDays} onChange={set("unlockDays")} error={errors.unlockDays} hint="Once assigned to the creator wallet, the 1% vests over this period after graduation." />
          <div className="field">
            <label htmlFor="migrateType">Pool after graduation</label>
            <select id="migrateType" data-field="migrateType" value={f.migrateType} onChange={set("migrateType")}>
              <option value="cpmm">Raydium CPMM</option>
              <option value="amm">Raydium AMM v4</option>
            </select>
          </div>
          <Field id="initialBuySol" label="Developer initial purchase (SOL)" inputMode="decimal" placeholder="0" value={f.initialBuySol} onChange={set("initialBuySol")} error={errors.initialBuySol} hint={`Optional first buy from your own SOL, up to ${MAX_INITIAL_BUY_SOL}.`} />
          <Field id="slippagePercent" label="Slippage for the first buy (%)" inputMode="decimal" value={f.slippagePercent} onChange={set("slippagePercent")} error={errors.slippagePercent} />
        </div>
      </fieldset>
      <div className="composer-row">
        <button type="submit" className="button button-primary">Review launch</button>
        <p className="hint">Runs on Solana {CLUSTERS[cluster].label}. Nothing is sent until you sign.</p>
      </div>
    </form>
  );
}

export function TxList({ checks }: { checks: TxCheck[] }) {
  const { cluster } = useNetwork();
  return (
    <ul className="tx-list">
      {checks.map((c) => (
        <li key={c.signature} className="tx-item">
          <p className={c.ok ? "status status-approved" : "status status-changes"}><span aria-hidden="true">{c.ok ? "✓" : "!"}</span> {c.status}{c.slot ? `, slot ${c.slot.toLocaleString("en-US")}` : ""}{c.feeLamports !== undefined ? `, fee ${c.feeLamports / 1e9} SOL` : ""}</p>
          <a className="mint" href={solscanTx(c.signature, cluster)} target="_blank" rel="noopener noreferrer">{c.signature}</a>
          {c.error && <p className="error">{c.error}</p>}
        </li>
      ))}
    </ul>
  );
}

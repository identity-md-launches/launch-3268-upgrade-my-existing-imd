import { useId, useState } from "react";

const SHARES = [
  { id: "treasury", label: "IMD ecosystem treasury", percent: 40, detail: "Held under multisig control for ecosystem programs." },
  { id: "ops", label: "Platform development and operations", percent: 20, detail: "Infrastructure, audits, support and new features." },
  { id: "nft", label: "IMD NFT worker rewards", percent: 20, detail: "Paid in IMD for verified worker contributions." },
  { id: "dev", label: "Developer IMD rewards", percent: 10, detail: "Paid in IMD to developers who ship on the platform." },
  { id: "burn", label: "IMD buyback and burn", percent: 10, detail: "Buys IMD on Ethereum and sends it to a burn address." },
];
export const splitRevenue = (amount: number) => SHARES.map((s) => ({ share: s, amount: ((Number.isFinite(amount) && amount > 0 ? amount : 0) * s.percent) / 100 }));
const money = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);

export function Revenue() {
  const [value, setValue] = useState("10000");
  const id = useId();
  const n = Number(value.replace(/[,$\s]/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(n) && n >= 0;
  return (
    <div className="revenue card">
      <div className="field revenue-input">
        <label htmlFor={id}>Eligible net platform revenue (USD)</label>
        <input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={valid ? undefined : true} aria-describedby={valid ? undefined : `${id}-error`} />
        {!valid && <p id={`${id}-error`} className="error">Enter an amount in US dollars, for example 10000.</p>}
      </div>
      <table className="split-table">
        <caption className="visually-hidden">Proposed revenue distribution</caption>
        <thead><tr><th scope="col">Allocation</th><th scope="col" className="right">Share</th><th scope="col" className="right">Amount</th></tr></thead>
        <tbody>
          {splitRevenue(valid ? n : 0).map(({ share, amount }) => (
            <tr key={share.id}>
              <th scope="row">
                <span className="split-label">{share.label}</span>
                <span className="split-bar" aria-hidden="true"><span style={{ inlineSize: `${share.percent * 2.5}%` }} /></span>
                <span className="muted split-detail">{share.detail}</span>
              </th>
              <td className="right num">{share.percent}%</td>
              <td className="right num">{money(amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">A proposed model, subject to final approval.</p>
    </div>
  );
}

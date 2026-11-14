import { useEffect, useRef, useState } from "react";
import { ConnectSheet } from "../wallet/ConnectSheet";
import { useNetwork } from "../wallet/SolanaProvider";
import { CLUSTERS, type ClusterId } from "../config";

const NAV = [
  { href: "#studio", label: "Studio" },
  { href: "#launch", label: "Launch" },
  { href: "#trade", label: "Trade" },
  { href: "#swarm", label: "Swarm" },
  { href: "#rewards", label: "Rewards" },
  { href: "#community", label: "Community" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const { cluster, setCluster, mainnetEnabled } = useNetwork();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="header">
      <div className="wrap header-row">
        <a className="brand" href="#main" aria-label="IMD Launchpad, back to top">
          <img src="./favicon.svg" alt="" width="28" height="28" />
          <span>IMD Launchpad</span>
        </a>
        <div className="header-tools">
          <label className="visually-hidden" htmlFor="network">Solana network</label>
          <select id="network" className="net-select" value={cluster} onChange={(e) => setCluster(e.target.value as ClusterId)}>
            <option value="devnet">{CLUSTERS.devnet.label}</option>
            <option value="mainnet-beta" disabled={!mainnetEnabled}>{CLUSTERS["mainnet-beta"].label}{mainnetEnabled ? "" : " (off)"}</option>
          </select>
          <ConnectSheet />
          <button ref={toggle} type="button" className="button button-quiet button-small menu-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Menu"}
          </button>
        </div>
        <nav id="site-nav" className={open ? "nav nav-open" : "nav"} aria-label="Sections">
          <ul>{NAV.map((n) => <li key={n.href}><a href={n.href} onClick={() => setOpen(false)}>{n.label}</a></li>)}</ul>
        </nav>
      </div>
    </header>
  );
}

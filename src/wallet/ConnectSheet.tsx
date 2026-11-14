import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { GET_WALLET, OPEN_IN, isMobileBrowser } from "./open-in";
import { WALLET_MARKS } from "./icons";
import { short } from "../lib/solana";
import { walletErrorText } from "../lib/solana";

/** One Connect control and its sheet. Connected, it shows the short address and Disconnect. */
export function ConnectSheet({ mobile: forcedMobile }: { mobile?: boolean }) {
  const mobile = forcedMobile ?? isMobileBrowser();
  const { wallets, wallet, select, connect, connecting, connected, publicKey, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = () => { setOpen(false); setPending(null); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => { if (connected) { setOpen(false); setPending(null); } }, [connected]);
  // After a wallet is selected, ask it to connect; its own prompt is the approval.
  useEffect(() => {
    if (!pending || !wallet || wallet.adapter.name !== pending || connected || connecting) return;
    connect().catch((e) => { setNote(walletErrorText(e)); setPending(null); });
  }, [pending, wallet, connected, connecting, connect]);

  const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);

  if (connected && publicKey) {
    const a = publicKey.toBase58();
    return (
      <div className="wallet-chip">
        <span className="wallet-addr num" title={a}>{wallet?.adapter.icon && <img src={wallet.adapter.icon} alt="" width={20} height={20} />}{short(a)}</span>
        <button type="button" className="button button-small button-quiet" onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }
  return (
    <>
      <button ref={trigger} type="button" className="button button-primary button-small connect" onClick={() => { setNote(""); setOpen(true); }}>Connect</button>
      {open && (
        <div className="sheet-bg" onClick={close}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <h2 id="sheet-title">Connect a Solana wallet</h2>
              <button ref={closeBtn} type="button" className="x" aria-label="Close" onClick={close}>×</button>
            </div>
            <div className="sheet-rows">
              {installed.map((w) => (
                <button key={w.adapter.name} type="button" className="row" disabled={!!pending && pending !== w.adapter.name}
                  onClick={() => { setNote(""); setPending(w.adapter.name); select(w.adapter.name as WalletName); }}>
                  <span className="ic"><img width={28} height={28} src={w.adapter.icon} alt="" /></span>
                  <span>{w.adapter.name}{pending === w.adapter.name ? ", opening…" : ""}</span>
                </button>
              ))}
              {mobile && installed.length === 0 && OPEN_IN.map((w) => (
                <a key={w.id} className="row" href={w.href(location.href)}>
                  <span className="ic"><img width={28} height={28} src={WALLET_MARKS[w.id]} alt="" /></span>
                  <span>Open in {w.name}</span>
                </a>
              ))}
              {!mobile && installed.length === 0 && GET_WALLET.map((w) => (
                <a key={w.id} className="row" href={w.href} target="_blank" rel="noopener noreferrer">
                  <span className="ic"><img width={28} height={28} src={WALLET_MARKS[w.id]} alt="" /></span>
                  <span>Install {w.name}</span>
                </a>
              ))}
            </div>
            <p className="hint">
              {installed.length === 0
                ? mobile ? "Opens this page inside the wallet app, where it can connect." : "No Solana wallet found in this browser. Install one, then reload this page."
                : "Connecting shares your address only. Every transaction asks for your approval in the wallet."}
            </p>
            {note && <p className="error" role="alert">{note}</p>}
          </div>
        </div>
      )}
    </>
  );
}

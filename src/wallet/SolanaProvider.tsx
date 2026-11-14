import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { CLUSTERS, DEFAULT_CLUSTER, MAINNET_ENABLED, type ClusterId } from "../config";

type Net = { cluster: ClusterId; setCluster: (c: ClusterId) => void; mainnetEnabled: boolean };
const NetCtx = createContext<Net>({ cluster: DEFAULT_CLUSTER, setCluster: () => {}, mainnetEnabled: MAINNET_ENABLED });
export const useNetwork = () => useContext(NetCtx);

/**
 * Wallets arrive through the Solana Wallet Standard: Phantom, Solflare, Backpack and every other
 * standard wallet register themselves, so the list holds exactly what this browser has installed.
 */
export function SolanaProvider({ children }: { children: ReactNode }) {
  const [cluster, setClusterState] = useState<ClusterId>(DEFAULT_CLUSTER);
  const setCluster = (c: ClusterId) => setClusterState(c === "mainnet-beta" && !MAINNET_ENABLED ? "devnet" : c);
  const net = useMemo(() => ({ cluster, setCluster, mainnetEnabled: MAINNET_ENABLED }), [cluster]);
  return (
    <NetCtx.Provider value={net}>
      <ConnectionProvider endpoint={CLUSTERS[cluster].rpc} config={{ commitment: "confirmed" }}>
        <WalletProvider wallets={[]} autoConnect>
          {children}
        </WalletProvider>
      </ConnectionProvider>
    </NetCtx.Provider>
  );
}

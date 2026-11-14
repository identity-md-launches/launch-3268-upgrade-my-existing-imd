/**
 * Owner-settable configuration. Everything here is public: a static export cannot hold secrets.
 */
export type ClusterId = "devnet" | "mainnet-beta";

/**
 * Mainnet launches and trades stay off until the site owner turns them on. Devnet is fully
 * functional: real LaunchLab programs, real transactions, test SOL.
 */
export const MAINNET_ENABLED = false;

export const CLUSTERS: Record<ClusterId, { label: string; rpc: string; sdkCluster: "devnet" | "mainnet" }> = {
  devnet: { label: "Devnet", rpc: "https://api.devnet.solana.com", sdkCluster: "devnet" },
  // The public mainnet endpoint rate-limits browsers. Set a dedicated RPC URL before enabling mainnet.
  "mainnet-beta": { label: "Mainnet", rpc: "https://api.mainnet-beta.solana.com", sdkCluster: "mainnet" },
};

export const DEFAULT_CLUSTER: ClusterId = "devnet";

/** Where IMD Swarm accepts project briefs. Empty: the studio offers copy and download instead of a link. */
export const IMD_SWARM_URL = "";

/** Ethereum IMD NFT collection used for worker ownership checks. Empty until the owner publishes it. */
export const IMD_NFT_CONTRACT = "";

export const SITE_NAME = "IMD Launchpad";

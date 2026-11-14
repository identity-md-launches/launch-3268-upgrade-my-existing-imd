/**
 * A phone browser has no extension, so the sheet offers to open this page inside a wallet's own
 * browser, where the wallet is injected. Each link is the one its vendor documents.
 */
export const OPEN_IN: ReadonlyArray<{ id: string; name: string; href: (url: string) => string }> = [
  // https://docs.phantom.com/phantom-deeplinks/other-methods/browse
  { id: "phantom", name: "Phantom", href: (url) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}` },
  // https://docs.solflare.com/solflare/technical/deeplinks/other-methods/browse
  { id: "solflare", name: "Solflare", href: (url) => `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(new URL(url).origin)}` },
];

export const GET_WALLET = [
  { id: "phantom", name: "Phantom", href: "https://phantom.com/download" },
  { id: "solflare", name: "Solflare", href: "https://solflare.com/download" },
];

export const isMobileBrowser = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

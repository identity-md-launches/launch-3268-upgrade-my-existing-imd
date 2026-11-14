/** Public DexScreener data: no key, CORS open. It indexes Solana mainnet pairs only. */
export type MarketStats = {
  pairUrl: string; pairAddress: string; dexId: string; priceUsd: number | null; liquidityUsd: number | null;
  volume24h: number | null; marketCap: number | null; fdv: number | null; change24h: number | null;
};

export async function fetchMarket(mint: string, signal?: AbortSignal): Promise<MarketStats | null> {
  const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`, { signal });
  if (!r.ok) throw new Error(`DexScreener answered ${r.status}`);
  const j = await r.json();
  const pairs: any[] = (j.pairs ?? []).filter((p: any) => p.chainId === "solana");
  if (!pairs.length) return null;
  const p = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const n = (v: unknown) => (v === undefined || v === null || Number.isNaN(Number(v)) ? null : Number(v));
  return {
    pairUrl: p.url, pairAddress: p.pairAddress, dexId: p.dexId, priceUsd: n(p.priceUsd), liquidityUsd: n(p.liquidity?.usd),
    volume24h: n(p.volume?.h24), marketCap: n(p.marketCap), fdv: n(p.fdv), change24h: n(p.priceChange?.h24),
  };
}

export const usd = (v: number | null) =>
  v === null ? "Not reported" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: v >= 1e6 ? "compact" : "standard", maximumFractionDigits: v < 1 ? 8 : 2 }).format(v);

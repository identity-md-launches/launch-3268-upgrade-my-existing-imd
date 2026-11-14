import { DEV_ALLOCATION_PERCENT, MAX_INITIAL_BUY_SOL, parseWhole } from "./plan";

/** LaunchLab mints use 6 decimals; SOL uses 9. */
export const TOKEN_DECIMALS = 6;
export const LAMPORTS = 1_000_000_000n;
export const MIN_SUPPLY = 10_000_000; // LaunchLab config minSupplyA
export const MAX_SUPPLY = 1_000_000_000_000;
export const MAX_LOGO_BYTES = 1_000_000;

export type LaunchForm = {
  name: string;
  symbol: string;
  supply: string;
  description: string;
  logoUrl: string;
  website: string;
  x: string;
  telegram: string;
  metadataUri: string;
  fundraiseSol: string;
  sellPercent: string;
  cliffDays: string;
  unlockDays: string;
  migrateType: "cpmm" | "amm";
  initialBuySol: string;
  slippagePercent: string;
};
export type LaunchErrors = Partial<Record<keyof LaunchForm | "logo", string>>;

export const EMPTY_LAUNCH: LaunchForm = {
  name: "", symbol: "", supply: "1000000000", description: "", logoUrl: "", website: "", x: "", telegram: "", metadataUri: "",
  fundraiseSol: "85", sellPercent: "79.31", cliffDays: "0", unlockDays: "30", migrateType: "cpmm", initialBuySol: "", slippagePercent: "1",
};

const URL_RE = /^(https:\/\/|ipfs:\/\/|ar:\/\/)[^\s]+$/i;
const okUrl = (v: string) => v.trim() === "" || URL_RE.test(v.trim());
const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

export function validateLaunch(f: LaunchForm): LaunchErrors {
  const e: LaunchErrors = {};
  if (!f.name.trim()) e.name = "Enter the token name.";
  else if (f.name.trim().length > 32) e.name = "Use a name of 32 characters or fewer.";
  if (!/^[A-Za-z0-9]{2,10}$/.test(f.symbol.trim())) e.symbol = "Use 2 to 10 letters or digits for the symbol.";
  const s = parseWhole(f.supply);
  if (!Number.isInteger(s) || s < MIN_SUPPLY || s > MAX_SUPPLY) e.supply = "Enter a whole number between 10,000,000 and 1,000,000,000,000.";
  if (f.description.length > 500) e.description = "Keep the description under 500 characters.";
  for (const k of ["logoUrl", "website", "x", "telegram"] as const) if (!okUrl(f[k])) e[k] = "Use a full link that starts with https://.";
  if (!f.metadataUri.trim()) e.metadataUri = "Paste the link to the hosted metadata file. Download it below, host it, then paste its link.";
  else if (!URL_RE.test(f.metadataUri.trim())) e.metadataUri = "Use a link that starts with https://, ipfs:// or ar://.";
  else if (f.metadataUri.trim().length > 200) e.metadataUri = "Keep the metadata link under 200 characters, the on-chain limit.";
  const fr = num(f.fundraiseSol);
  if (!Number.isFinite(fr) || fr < 1 || fr > 10000) e.fundraiseSol = "Enter a graduation target from 1 to 10,000 SOL.";
  const sp = num(f.sellPercent);
  if (!Number.isFinite(sp) || sp < 20 || sp > 90) e.sellPercent = "Sell from 20% to 90% of supply on the curve.";
  else if (sp + DEV_ALLOCATION_PERCENT > 95) e.sellPercent = "Leave at least 4% of supply for the Raydium pool after graduation.";
  const cl = num(f.cliffDays), un = num(f.unlockDays);
  if (!Number.isInteger(cl) || cl < 0 || cl > 365) e.cliffDays = "Enter whole days from 0 to 365.";
  if (!Number.isInteger(un) || un < 0 || un > 1460) e.unlockDays = "Enter whole days from 0 to 1,460.";
  const b = num(f.initialBuySol);
  if (!Number.isFinite(b) || b < 0 || b > MAX_INITIAL_BUY_SOL) e.initialBuySol = `Enter an amount from 0 to ${MAX_INITIAL_BUY_SOL} SOL, or leave it empty.`;
  const sl = num(f.slippagePercent);
  if (!Number.isFinite(sl) || sl <= 0 || sl > 50) e.slippagePercent = "Enter slippage above 0% and up to 50%.";
  return e;
}

/** Decimal string to integer units without floating-point drift. */
export function toUnits(v: string, decimals: number): bigint {
  const [w, f = ""] = v.trim().replace(/[,_\s]/g, "").split(".");
  return BigInt(w || "0") * 10n ** BigInt(decimals) + BigInt((f + "0".repeat(decimals)).slice(0, decimals) || "0");
}

export type LaunchNumbers = {
  supply: bigint; totalSellA: bigint; totalLockedAmount: bigint; migrateAmount: bigint; totalFundRaisingB: bigint;
  cliffSeconds: bigint; unlockSeconds: bigint; buyLamports: bigint; slippageBps: bigint;
};

/** The exact integers sent to LaunchLab, so the review screen and the transaction never disagree. */
export function launchNumbers(f: LaunchForm): LaunchNumbers {
  const supply = BigInt(parseWhole(f.supply)) * 10n ** BigInt(TOKEN_DECIMALS);
  const sellBps = BigInt(Math.round(num(f.sellPercent) * 100));
  const totalSellA = (supply * sellBps) / 10000n;
  const totalLockedAmount = (supply * BigInt(DEV_ALLOCATION_PERCENT)) / 100n;
  return {
    supply, totalSellA, totalLockedAmount, migrateAmount: supply - totalSellA - totalLockedAmount,
    totalFundRaisingB: toUnits(f.fundraiseSol || "0", 9),
    cliffSeconds: BigInt(num(f.cliffDays) * 86400), unlockSeconds: BigInt(num(f.unlockDays) * 86400),
    buyLamports: toUnits(f.initialBuySol || "0", 9), slippageBps: BigInt(Math.round(num(f.slippagePercent) * 100)),
  };
}

export const fromUnits = (v: bigint, decimals: number) => {
  const d = 10n ** BigInt(decimals);
  const w = v / d, r = v % d;
  const frac = r === 0n ? "" : `.${r.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
  return `${new Intl.NumberFormat("en-US").format(w)}${frac}`;
};

/** Metaplex token metadata JSON, the file the on-chain URI points at. */
export function metadataJson(f: LaunchForm) {
  const ext: Record<string, string> = {};
  if (f.website.trim()) ext.website = f.website.trim();
  if (f.x.trim()) ext.twitter = f.x.trim();
  if (f.telegram.trim()) ext.telegram = f.telegram.trim();
  return {
    name: f.name.trim(), symbol: f.symbol.trim().toUpperCase(), description: f.description.trim(),
    image: f.logoUrl.trim(), ...(f.website.trim() ? { external_url: f.website.trim() } : {}),
    extensions: ext, properties: { files: f.logoUrl.trim() ? [{ uri: f.logoUrl.trim(), type: "image/png" }] : [], category: "image" },
    createdOn: "IMD Launchpad",
  };
}

/**
 * Raydium LaunchLab through the official SDK. Loaded on demand so the first screen stays light.
 * Every transaction is built here and signed in the visitor's own wallet; nothing is signed by the site.
 */
import { Connection, Keypair, PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";
import BN from "bn.js";
import {
  ALL_PROGRAM_ID, DEVNET_PROGRAM_ID, LaunchpadConfig, LaunchpadPool, LaunchpadVesting, Raydium, TxVersion, getPdaLaunchpadConfigId, getPdaLaunchpadPoolId, getPdaVestId,
} from "@raydium-io/raydium-sdk-v2";
import type { ClusterId } from "../config";
import { CLUSTERS } from "../config";
import type { LaunchForm } from "./launchParams";
import { TOKEN_DECIMALS, launchNumbers } from "./launchParams";
import { WSOL } from "./solana";

type SignAll = <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
const NATIVE = new PublicKey(WSOL);
const big = (v: bigint) => new BN(v.toString());

export function programs(cluster: ClusterId) {
  const ids = cluster === "devnet" ? DEVNET_PROGRAM_ID : ALL_PROGRAM_ID;
  const programId = ids.LAUNCHPAD_PROGRAM;
  return { programId, platformId: ids.LAUNCHPAD_PLATFORM, configId: getPdaLaunchpadConfigId(programId, NATIVE, 0, 0).publicKey };
}
export const poolIdFor = (cluster: ClusterId, mint: string) => getPdaLaunchpadPoolId(programs(cluster).programId, new PublicKey(mint), NATIVE).publicKey;

async function load(connection: Connection, cluster: ClusterId, owner?: PublicKey, signAllTransactions?: SignAll) {
  return Raydium.load({
    connection, cluster: CLUSTERS[cluster].sdkCluster, owner, signAllTransactions: signAllTransactions as any,
    disableLoadToken: true, disableFeatureCheck: true, blockhashCommitment: "confirmed",
  });
}

export type LaunchResult = { mint: string; poolId: string; txIds: string[] };

export async function createLaunch(connection: Connection, cluster: ClusterId, owner: PublicKey, signAll: SignAll, form: LaunchForm): Promise<LaunchResult> {
  const raydium = await load(connection, cluster, owner, signAll);
  const { programId, platformId, configId } = programs(cluster);
  const acc = await connection.getAccountInfo(configId);
  if (!acc) throw new Error("LaunchLab config account was not found on this network.");
  const configInfo = LaunchpadConfig.decode(acc.data);
  const n = launchNumbers(form);
  const mintKeypair = Keypair.generate();
  const createOnly = n.buyLamports === 0n;
  const { execute, extInfo } = await raydium.launchpad.createLaunchpad({
    programId, platformId, configId, configInfo, mintA: mintKeypair.publicKey, decimals: TOKEN_DECIMALS,
    name: form.name.trim(), symbol: form.symbol.trim().toUpperCase(), uri: form.metadataUri.trim(), migrateType: form.migrateType,
    supply: big(n.supply), totalSellA: big(n.totalSellA), totalFundRaisingB: big(n.totalFundRaisingB),
    totalLockedAmount: big(n.totalLockedAmount), cliffPeriod: big(n.cliffSeconds), unlockPeriod: big(n.unlockSeconds),
    createOnly, buyAmount: createOnly ? new BN(1) : big(n.buyLamports), slippage: big(n.slippageBps),
    extraSigners: [mintKeypair], txVersion: TxVersion.V0,
  });
  const { txIds } = await execute({ sequentially: true });
  return { mint: mintKeypair.publicKey.toBase58(), poolId: extInfo.address.poolId.toBase58(), txIds };
}

/**
 * The 1% developer allocation. createLaunchpad only reserves it (the pool's totalLockedAmount); the tokens belong
 * to nobody until the creator signs create_vesting_account, which writes a vesting record naming the beneficiary.
 */
export type DevAllocation = {
  status: "allocated" | "pending"; record: string; beneficiary: string; reserved: bigint; allocated: bigint; recordShare: bigint;
};

export async function readDevAllocation(connection: Connection, cluster: ClusterId, mint: string, beneficiary: PublicKey): Promise<DevAllocation | null> {
  const { programId } = programs(cluster);
  const poolId = poolIdFor(cluster, mint);
  const poolAcc = await connection.getAccountInfo(poolId);
  if (!poolAcc) return null;
  const { vestingSchedule } = LaunchpadPool.decode(poolAcc.data);
  const record = getPdaVestId(programId, poolId, beneficiary).publicKey;
  const recAcc = await connection.getAccountInfo(record);
  let recordShare = 0n;
  if (recAcc && recAcc.owner.equals(programId)) {
    const v = LaunchpadVesting.decode(recAcc.data);
    if (v.poolId.equals(poolId) && v.beneficiary.equals(beneficiary)) recordShare = BigInt(v.tokenShareAmount.toString());
  }
  const reserved = BigInt(vestingSchedule.totalLockedAmount.toString());
  return {
    status: reserved > 0n && recordShare >= reserved ? "allocated" : "pending", record: record.toBase58(), beneficiary: beneficiary.toBase58(),
    reserved, allocated: BigInt(vestingSchedule.totalAllocatedShare.toString()), recordShare,
  };
}

/** Assigns the reserved, still unallocated share to the creator wallet. The wallet shows the transaction for approval. */
export async function allocateDeveloper(connection: Connection, cluster: ClusterId, owner: PublicKey, signAll: SignAll, mint: string): Promise<string> {
  const { programId } = programs(cluster);
  const poolId = poolIdFor(cluster, mint);
  // A pool created moments ago can lag behind on the RPC node; wait up to 30 s for it.
  for (let i = 0; i < 15 && !(await connection.getAccountInfo(poolId)); i++) await new Promise((r) => setTimeout(r, 2000));
  const raydium = await load(connection, cluster, owner, signAll);
  const { vestingSchedule, creator } = await raydium.launchpad.getRpcPoolInfo({ poolId });
  if (!creator.equals(owner)) throw new Error("Only the wallet that created this token can assign its developer allocation.");
  const share = vestingSchedule.totalLockedAmount.sub(vestingSchedule.totalAllocatedShare);
  if (share.lten(0)) throw new Error("The reserved allocation is already assigned.");
  const { execute } = await raydium.launchpad.createVesting({ programId, poolId, beneficiary: owner, shareAmount: share, txVersion: TxVersion.V0 });
  const { txId } = await execute({ sendAndConfirm: true });
  return txId;
}

export type CurveState = {
  poolId: string; status: number; statusText: string; priceSol: number; marketCapSol: number; raisedSol: number; targetSol: number;
  progress: number; soldTokens: number; sellTokens: number; supplyTokens: number; creator: string;
};

export async function readCurve(connection: Connection, cluster: ClusterId, mint: string): Promise<CurveState | null> {
  const raydium = await load(connection, cluster);
  const poolId = poolIdFor(cluster, mint);
  const exists = await connection.getAccountInfo(poolId);
  if (!exists) return null;
  const p = await raydium.launchpad.getRpcPoolInfo({ poolId });
  const dA = 10 ** p.mintDecimalsA, dB = 10 ** p.mintDecimalsB;
  const num = (b: BN) => Number(b.toString());
  // Constant-product curve: price = (virtualB + realB) / (virtualA - realA).
  const priceSol = (num(p.virtualB) + num(p.realB)) / dB / ((num(p.virtualA) - num(p.realA)) / dA);
  const supplyTokens = num(p.supply) / dA;
  const raisedSol = num(p.realB) / dB, targetSol = num(p.totalFundRaisingB) / dB;
  return {
    poolId: poolId.toBase58(), status: p.status, statusText: p.status === 0 ? "Trading on the bonding curve" : p.status === 1 ? "Graduating to a Raydium pool" : "Graduated to a Raydium pool",
    priceSol, marketCapSol: priceSol * supplyTokens, raisedSol, targetSol, progress: targetSol ? Math.min(1, raisedSol / targetSol) : 0,
    soldTokens: num(p.realA) / dA, sellTokens: num(p.totalSellA) / dA, supplyTokens, creator: p.creator.toBase58(),
  };
}

export async function tradeCurve(
  connection: Connection, cluster: ClusterId, owner: PublicKey, signAll: SignAll, mint: string, side: "buy" | "sell", amount: bigint, slippageBps: bigint,
): Promise<string> {
  const raydium = await load(connection, cluster, owner, signAll);
  const { programId } = programs(cluster);
  const mintA = new PublicKey(mint);
  const res = side === "buy"
    ? await raydium.launchpad.buyToken({ programId, mintA, buyAmount: big(amount), slippage: big(slippageBps), txVersion: TxVersion.V0 })
    : await raydium.launchpad.sellToken({ programId, mintA, sellAmount: big(amount), slippage: big(slippageBps), txVersion: TxVersion.V0 });
  const { txId } = await res.execute({ sendAndConfirm: true });
  return txId;
}

export async function tokenBalance(connection: Connection, owner: PublicKey, mint: string) {
  const r = await connection.getParsedTokenAccountsByOwner(owner, { mint: new PublicKey(mint) });
  return r.value.reduce((s, a) => s + BigInt(a.account.data.parsed.info.tokenAmount.amount), 0n);
}

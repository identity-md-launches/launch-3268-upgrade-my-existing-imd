import { describe, expect, it } from "vitest";
import { buildPlan, validatePlan, swarmBrief, DEFAULT_FEES, EXAMPLE_IDEA } from "../src/lib/plan";
import { EMPTY_LAUNCH, launchNumbers, metadataJson, toUnits, validateLaunch } from "../src/lib/launchParams";
import { verifyTransaction, isAddress, solscanTx } from "../src/lib/solana";
import { splitRevenue } from "../src/components/Revenue";

const pro = { name: "", ticker: "", supply: "1000000000", initialBuySol: "", fees: { ...DEFAULT_FEES } };

describe("planner", () => {
  it("rejects short ideas and bad pro settings", () => {
    expect(validatePlan("too short", "easy", pro).idea).toBeTruthy();
    const e = validatePlan(EXAMPLE_IDEA, "pro", { ...pro, ticker: "x", supply: "5", initialBuySol: "500", fees: { creators: 50, holders: 50, treasury: 50 } });
    expect(Object.keys(e).sort()).toEqual(["fees", "initialBuySol", "supply", "ticker"]);
  });
  it("builds a plan with a 1% developer allocation and a Swarm brief", () => {
    const p = buildPlan(EXAMPLE_IDEA, "easy", pro);
    expect(p.developerAllocation).toBe(10_000_000);
    expect(p.curveAllocation + p.developerAllocation).toBe(p.supply);
    expect(p.categories).toContain("Game");
    expect(swarmBrief(p)).toContain("Playable browser game");
  });
});

describe("launch parameters", () => {
  const ok = { ...EMPTY_LAUNCH, name: "Snail Racers", symbol: "SNAIL", metadataUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", initialBuySol: "0.5" };
  it("accepts a complete form and flags missing pieces", () => {
    expect(validateLaunch(ok)).toEqual({});
    const e = validateLaunch(EMPTY_LAUNCH);
    expect(e.name && e.symbol && e.metadataUri).toBeTruthy();
    expect(validateLaunch({ ...ok, supply: "1000" }).supply).toBeTruthy();
    expect(validateLaunch({ ...ok, website: "http://insecure" }).website).toBeTruthy();
  });
  it("splits supply exactly: curve + 1% locked + pool seed = supply", () => {
    const n = launchNumbers(ok);
    expect(n.supply).toBe(1_000_000_000n * 1_000_000n);
    expect(n.totalLockedAmount).toBe(n.supply / 100n);
    expect(n.totalSellA + n.totalLockedAmount + n.migrateAmount).toBe(n.supply);
    expect(n.buyLamports).toBe(500_000_000n);
    expect(n.unlockSeconds).toBe(30n * 86400n);
    expect(toUnits("85", 9)).toBe(85_000_000_000n);
    expect(toUnits("0.000000001", 9)).toBe(1n);
  });
  it("writes Metaplex metadata", () => {
    const m = metadataJson({ ...ok, logoUrl: "ipfs://logo", x: "https://x.com/snail" });
    expect(m).toMatchObject({ name: "Snail Racers", symbol: "SNAIL", image: "ipfs://logo", extensions: { twitter: "https://x.com/snail" } });
  });
});

describe("on-chain verification", () => {
  const sig = "5".repeat(88);
  const conn = (status: any, tx: any) => ({ getSignatureStatuses: async () => ({ value: [status] }), getTransaction: async () => tx });
  it("reports missing, failed and confirmed transactions", async () => {
    expect((await verifyTransaction(conn(null, null), sig)).ok).toBe(false);
    const failed = await verifyTransaction(conn({ slot: 9, err: { InstructionError: [0, "Custom"] }, confirmationStatus: "confirmed" }, null), sig);
    expect(failed.status).toBe("Failed");
    const good = await verifyTransaction(conn({ slot: 10, err: null, confirmationStatus: "finalized" }, {
      blockTime: 1, meta: { fee: 5000, err: null },
      transaction: { message: { staticAccountKeys: [{ toBase58: () => "A" }, { toBase58: () => "Prog" }], compiledInstructions: [{ programIdIndex: 1 }] } },
    }), sig);
    expect(good).toMatchObject({ ok: true, status: "Finalized", feeLamports: 5000, programs: ["Prog"] });
  });
  it("validates addresses and builds explorer links per cluster", () => {
    expect(isAddress("So11111111111111111111111111111111111111112")).toBe(true);
    expect(isAddress("0xabc")).toBe(false);
    expect(solscanTx("abc", "devnet")).toContain("cluster=devnet");
  });
  it("splits revenue by the proposed shares", () => {
    expect(splitRevenue(10000).map((r) => r.amount)).toEqual([4000, 2000, 2000, 1000, 1000]);
  });
});

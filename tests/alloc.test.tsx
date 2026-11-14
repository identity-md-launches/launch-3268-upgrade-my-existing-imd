import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublicKey } from "@solana/web3.js";

const owner = new PublicKey("2Fp1H4YvhzxGTXtFUdUv2ndT4pPPpqxkUVSyHoZuqd4s");
const signAllTransactions = vi.fn();
const connection = {
  getSignatureStatuses: async () => ({ value: [{ confirmationStatus: "confirmed", err: null, slot: 42 }] }),
  getTransaction: async () => null,
};
vi.mock("@solana/wallet-adapter-react", () => ({
  useConnection: () => ({ connection }),
  useWallet: () => ({ publicKey: owner, signAllTransactions, connected: true }),
}));
const readDevAllocation = vi.fn();
const allocateDeveloper = vi.fn();
vi.mock("../src/lib/launchlab", () => ({ readDevAllocation, allocateDeveloper }));

import { DevAllocation } from "../src/components/DevAllocation";

const base = { record: "5mZbMi3HXAqU6wbvNzSq1fwwZHzBfX1tX8PHw5cPSJ61", beneficiary: owner.toBase58(), reserved: 10_000_000_000_000n };
const pending = { ...base, status: "pending", allocated: 0n, recordShare: 0n };
const allocated = { ...base, status: "allocated", allocated: base.reserved, recordShare: base.reserved };
const SIG = "5".repeat(88);

beforeEach(() => { cleanup(); readDevAllocation.mockReset(); allocateDeveloper.mockReset(); });

describe("developer allocation", () => {
  it("says pending until the vesting record is verified, then completes with one approval", async () => {
    readDevAllocation.mockResolvedValueOnce(pending).mockResolvedValueOnce(allocated);
    allocateDeveloper.mockResolvedValue(SIG);
    const u = userEvent.setup();
    render(<DevAllocation mint="So11111111111111111111111111111111111111112" />);
    expect(await screen.findByText(/1% reserved; developer allocation pending/)).toBeTruthy();
    expect(allocateDeveloper).not.toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: "Complete developer allocation" }));
    expect(allocateDeveloper).toHaveBeenCalledWith(connection, "devnet", owner, signAllTransactions, "So11111111111111111111111111111111111111112");
    expect(await screen.findByText(/1% developer allocation assigned to your wallet, verified on chain/)).toBeTruthy();
    expect(screen.getByText(/^10,000,000 tokens/)).toBeTruthy();
    expect(screen.getByText(SIG)).toBeTruthy();
  });

  it("asks right after a launch and keeps a way to finish if the wallet declines", async () => {
    readDevAllocation.mockResolvedValue(pending);
    allocateDeveloper.mockRejectedValue(new Error("User rejected the request."));
    render(<DevAllocation mint="So11111111111111111111111111111111111111112" autoStart />);
    expect(await screen.findByText("You declined the request in your wallet. Nothing was sent.")).toBeTruthy();
    expect(allocateDeveloper).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/1% reserved; developer allocation pending/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Complete developer allocation" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

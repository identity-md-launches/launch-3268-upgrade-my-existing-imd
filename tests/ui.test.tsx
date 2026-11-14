import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";

beforeEach(() => { cleanup(); localStorage.clear(); });

describe("launchpad page", () => {
  it("shows the product and its main action first", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Idea in. Ecosystem out." })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Build my plan" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Connect" })).toBeTruthy();
  });

  it("opens and closes the wallet sheet", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Connect" }));
    const dialog = screen.getByRole("dialog", { name: "Connect a Solana wallet" });
    expect(within(dialog).getByText("Install Phantom")).toBeTruthy();
    expect(within(dialog).getByText("Install Solflare")).toBeTruthy();
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("builds a plan and hands it to the launch form", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Build my plan" }));
    expect(screen.getByText(/at least 4 words/)).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Use an example" }));
    await u.click(screen.getByRole("button", { name: "Build my plan" }));
    expect(screen.getByRole("heading", { level: 2, name: /Racing Snail/ })).toBeTruthy();
    await u.click(screen.getByRole("tab", { name: "Token" }));
    expect(screen.getByText("10,000,000, vested through LaunchLab")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Launch this token" }));
    expect((screen.getByLabelText("Token name") as HTMLInputElement).value).toBe("Racing Snail");
    expect((screen.getByLabelText("Symbol") as HTMLInputElement).value).toBe("RASN");
  });

  it("validates the launch form and shows an exact review that needs a wallet to sign", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Review launch" }));
    expect(screen.getByText("Enter the token name.")).toBeTruthy();
    expect(document.activeElement?.id).toBe("name");
    await u.type(screen.getByLabelText("Token name"), "Snail Racers");
    await u.type(screen.getByLabelText("Symbol"), "SNAIL");
    await u.type(screen.getByLabelText("Metadata link"), "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi");
    await u.type(screen.getByLabelText("Developer initial purchase (SOL)"), "0.5");
    await u.click(screen.getByRole("button", { name: "Review launch" }));
    expect(screen.getByRole("heading", { name: "Review before you sign" })).toBeTruthy();
    expect(screen.getByText("10,000,000, vesting to your wallet: 0 day cliff, then 30 days")).toBeTruthy();
    expect(screen.getByText(/0\.5 SOL from your wallet/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Sign and launch" }) as HTMLButtonElement).disabled).toBe(true);
    await u.click(screen.getByRole("button", { name: "Edit settings" }));
    expect((screen.getByLabelText("Token name") as HTMLInputElement).value).toBe("Snail Racers");
  });

  it("adds, rejects and removes watchlist tokens", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.type(screen.getByLabelText("Solana mint address"), "not-a-mint");
    await u.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(screen.getByText(/Paste a Solana mint address/)).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Fill in wrapped SOL" }));
    await u.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(screen.getByRole("heading", { level: 3, name: "Wrapped SOL" })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("imd-launchpad:watchlist")!)).toHaveLength(1);
    await u.click(screen.getByRole("button", { name: /^Remove/ }));
    expect(screen.queryByRole("heading", { level: 3, name: "Wrapped SOL" })).toBeNull();
  });

  it("rejects malformed signatures before calling the network", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.type(screen.getByLabelText(/Transaction signature/), "abc");
    await u.click(screen.getByRole("button", { name: "Verify" }));
    expect(screen.getByText(/Paste a transaction signature/)).toBeTruthy();
  });
});

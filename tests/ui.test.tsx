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
    expect(screen.getByText(/^10,000,000 reserved at creation, then assigned to your wallet by a second approval/)).toBeTruthy();
    expect(screen.getByText(/Your wallet asks twice/)).toBeTruthy();
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
    expect(JSON.parse(localStorage.getItem("imd-launchpad:watchlist")!)).toEqual([{ mint: "So11111111111111111111111111111111111111112", label: "Wrapped SOL", cluster: "mainnet-beta" }]);
    expect(screen.getByRole("link", { name: "Solscan" }).getAttribute("href")).toBe("https://solscan.io/token/So11111111111111111111111111111111111111112");
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

  it("keeps the page when launch numbers are invalid or half typed", async () => {
    const u = userEvent.setup();
    render(<App />);
    for (const [label, v] of [["Sold on the curve (%)", "x"], ["Graduation target (SOL)", "-"], ["Developer initial purchase (SOL)", "1e-3"]] as const) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      await u.clear(input);
      await u.type(input, v);
      expect(screen.getByRole("button", { name: "Review launch" })).toBeTruthy();
    }
    await u.type(screen.getByLabelText("Token name"), "Snail Racers");
    await u.type(screen.getByLabelText("Symbol"), "SNAIL");
    await u.type(screen.getByLabelText("Metadata link"), "https://example.com/metadata.json");
    await u.click(screen.getByRole("button", { name: "Review launch" }));
    expect(screen.getByText("Sell from 20% to 90% of supply on the curve.")).toBeTruthy();
    expect(screen.getByText("Enter a graduation target from 1 to 10,000 SOL.")).toBeTruthy();
    expect(screen.getByText(/Enter an amount from 0 to/)).toBeTruthy();
    expect(document.activeElement?.id).toBe("fundraiseSol");
  });

  it("gives planner and launch form errors their own ids", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("radio", { name: "Pro mode" }));
    await u.type(screen.getByLabelText("Token name (optional)"), "A".repeat(33));
    await u.click(screen.getByRole("button", { name: "Use an example" }));
    await u.click(screen.getByRole("button", { name: "Build my plan" }));
    await u.click(screen.getByRole("button", { name: "Review launch" }));
    const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(document.getElementById(screen.getByLabelText("Token name").getAttribute("aria-describedby")!)?.textContent).toBe("Enter the token name.");
  });

  it("keeps keyboard focus inside the wallet sheet and returns it to Connect", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Connect" }));
    const dialog = screen.getByRole("dialog");
    expect(document.getElementById("root") === null || document.getElementById("root")!.hasAttribute("inert")).toBe(true);
    for (let i = 0; i < 6; i++) { await u.tab(); expect(dialog.contains(document.activeElement)).toBe(true); }
    await u.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await u.keyboard("{Escape}");
    expect(document.activeElement?.textContent).toBe("Connect");
  });

  it("stores the network with each watchlist token and links devnet tokens to devnet", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.type(screen.getByLabelText("Solana mint address"), "So11111111111111111111111111111111111111112");
    expect((screen.getByLabelText("Network") as HTMLSelectElement).value).toBe("devnet");
    await u.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(screen.getByRole("link", { name: "Solscan" }).getAttribute("href")).toBe("https://solscan.io/token/So11111111111111111111111111111111111111112?cluster=devnet");
    expect(screen.queryByRole("link", { name: "DexScreener" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Market data/ })).toBeNull();
    expect(screen.getByText(/Devnet test token/)).toBeTruthy();
  });
});

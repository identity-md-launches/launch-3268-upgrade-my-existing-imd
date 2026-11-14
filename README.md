# IMD Launchpad

The IMD Launchpad site ("Idea in. Ecosystem out."), upgraded from a planner into a non-custodial Solana token launchpad on **Raydium LaunchLab**. The original design, copy and features are kept: the idea planner, the project studio, Swarm workers, the IMD NFT workers, the revenue split with buyback and burn, community, security and chains. Built with Vite, React 18 and TypeScript, and exported as a static site to `dist/`.

## What works

| Feature | How |
| --- | --- |
| Solana wallets | `@solana/wallet-adapter-react` with the Wallet Standard. Phantom, Solflare, Backpack and any other standard wallet installed in the browser appear by name and icon. Phones get "Open in Phantom/Solflare" deep links. No relay and no project ID |
| Token creation | `@raydium-io/raydium-sdk-v2` `launchpad.createLaunchpad`. Name, symbol, supply (10M to 1T, 6 decimals), logo preview, description and links, a downloadable Metaplex metadata file, the metadata URI, graduation target, share sold on the curve, pool type (CPMM or AMM v4) and slippage. A fresh mint keypair is generated in the browser, signs only its own creation, and is then discarded |
| 1% developer allocation | LaunchLab's native `totalLockedAmount` vesting: exactly 1% of supply vests to the creator wallet with an owner-chosen cliff and unlock period. The review screen shows the exact amounts |
| Developer initial purchase | A separate SOL amount (`buyAmount`, with `createOnly` when it is 0), bought from the creator's own wallet in the same signing step |
| Verification | After signing, every signature is read back (`getSignatureStatuses` and `getTransaction`), and the LaunchLab pool account is confirmed to exist before the token is added to the watchlist. A "Verify a transaction" tool checks any signature |
| Trading | `launchpad.buyToken` and `launchpad.sellToken` on the bonding curve, with slippage, a holdings check, and verification after each trade |
| Live data | Curve price, market cap, SOL raised and graduation progress are read from chain every 15s, with a sparkline of those real readings. For mainnet pairs, DexScreener's public API gives USD price, liquidity, 24h volume, market cap, a live chart embed and DexScreener links |
| IMD Swarm | The planner builds the Swarm deliverables. "Copy Swarm brief" exports the job, and "Launch this token" carries the plan into the launch form |
| Non-custodial | No keys, no backend, no stored secrets. Every transaction opens in the user's wallet and needs approval there |

## Owner settings (`src/config.ts`)

- `MAINNET_ENABLED = false`. Devnet is the default and works end to end against Raydium's devnet LaunchLab program. Mainnet launches and trades stay off until you turn this on. Before that, also set `CLUSTERS["mainnet-beta"].rpc` to a dedicated RPC, because the public endpoint rate-limits browsers.
- `IMD_SWARM_URL`: where IMD Swarm accepts briefs. Empty means copy and download only.
- `IMD_NFT_CONTRACT`: the Ethereum IMD NFT collection for worker ownership checks. Empty means the section explains the flow and says registration opens once the contract is published.

## Install, preview, rebuild

```bash
npm ci              # install from the lockfile
npm run dev         # local dev server
npm run typecheck   # tsc --noEmit
npm test            # vitest: logic and interaction tests (jsdom)
npm run build       # typecheck + production build into dist/
npm run preview     # serve the built dist/ locally
```

`dist/` is committed and uses relative URLs (`base: "./"`), so it can be served from any static host, IPFS gateway subpath or ENS name. Rebuild after any source change and commit `dist/` again.

## Validation results (this run)

- `npm run build`: passed (tsc clean, Vite built `index` 204 kB gzip and the lazily loaded `launchlab` SDK chunk 198 kB gzip).
- `npm run typecheck`: passed with no errors.
- `npx vitest run`: **14 of 14 passed**. These cover planner validation, the 1% split adding up exactly, unit conversion, the metadata file, transaction verification (missing, failed and finalized), explorer links, the revenue split, the first screen, the wallet sheet opening and closing on Escape, plan to studio to launch-form handoff, launch form validation with focus on the first error and an exact review with signing disabled when no wallet is connected, watchlist add, reject and remove, and signature validation.
- A live devnet SDK probe (Node) loaded `Raydium` for devnet, derived the LaunchLab config PDA `7ZR4zD7P…` and platform, and decoded the on-chain config (min supply 10,000,000; trade fee 0.25%). Raydium's devnet config API, DexScreener's API and the devnet RPC all return CORS headers that let a browser call them.
- **Not run**: the design probe (`taste.mjs`) and all rendered or browser checks. Chromium could not start on this machine because system libraries are missing (libatk, libXcomposite, libasound and others). No screenshots, measured contrast or overflow results exist. See `VALIDATION.md`.
- **Not performed**: no token was created and no trade was signed, because this environment has no wallet or funded keypair. Signing flows are tested up to the wallet boundary. Nothing was deployed to mainnet.

## Limits within the IMD Swarm environment

- **Hosting logos and metadata.** LaunchLab needs a hosted metadata URI (200 characters at most). A static site cannot hold pinning keys, so the form previews the logo and downloads `metadata.json`, and the creator hosts both (IPFS or Arweave) and pastes the link.
- **Creator, holder and treasury fee split.** This stays a planning setting. LaunchLab pays creator fees to the creator only, and holder or treasury distribution needs a platform config or a separate program.
- **DexScreener.** It indexes mainnet only, so devnet tokens show on-chain curve data and no DexScreener stats.
- **Ethereum NFT workers and buyback-and-burn.** These are kept as the proposed model and content. Ownership checks need the contract address, and burns need the treasury's contracts, neither of which was provided.
- **IMD Swarm API.** No public endpoint or credentials were provided, so the integration is the brief export and plan handoff.

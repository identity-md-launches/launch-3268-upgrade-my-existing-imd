# IMD Launchpad

The IMD Launchpad site ("Idea in. Ecosystem out."), upgraded from a planner into a non-custodial Solana token launchpad on **Raydium LaunchLab**. The original design, copy and features are kept: the idea planner, the project studio, Swarm workers, the IMD NFT workers, the revenue split with buyback and burn, community, security and chains. Built with Vite, React 18 and TypeScript, and exported as a static site to `dist/`.

## What works

| Feature | How |
| --- | --- |
| Solana wallets | `@solana/wallet-adapter-react` with the Wallet Standard. Phantom, Solflare, Backpack and any other standard wallet installed in the browser appear by name and icon. Phones get "Open in Phantom/Solflare" deep links. No relay and no project ID |
| Token creation | `@raydium-io/raydium-sdk-v2` `launchpad.createLaunchpad`. Name, symbol, supply (10M to 1T, 6 decimals), logo preview, description and links, a downloadable Metaplex metadata file, the metadata URI, graduation target, share sold on the curve, pool type (CPMM or AMM v4) and slippage. A fresh mint keypair is generated in the browser, signs only its own creation, and is then discarded |
| 1% developer allocation | Two LaunchLab steps. `createLaunchpad` reserves exactly 1% of supply as `totalLockedAmount`, with the chosen cliff and unlock period. Then `launchpad.createVesting` (`create_vesting_account`), a second wallet approval requested right after the launch, assigns that share to the creator wallet in its vesting record. The page reads the record back (PDA from `getPdaVestId`, decoded with `LaunchpadVesting`) and calls the 1% allocated only when the record names the wallet for the full reserved amount. Until then it shows "1% reserved; developer allocation pending" with a "Complete developer allocation" button. The button also appears in the trade panel whenever the creator wallet loads its own token, so the allocation can still be finished after a reload |
| Developer initial purchase | A separate SOL amount (`buyAmount`, with `createOnly` when it is 0), bought from the creator's own wallet in the same signing step |
| Verification | After signing, every signature is read back (`getSignatureStatuses` and `getTransaction`), and the LaunchLab pool account is confirmed to exist before the token is added to the watchlist. A "Verify a transaction" tool checks any signature |
| Trading | `launchpad.buyToken` and `launchpad.sellToken` on the bonding curve, with slippage, a holdings check, and verification after each trade |
| Watchlist | Each saved token keeps its network. Devnet tokens link to Solscan with `?cluster=devnet` and say that DexScreener and Raydium list mainnet only. Mainnet tokens get DexScreener market data and Raydium and Solscan links. The wrapped SOL example is labelled as mainnet market data |
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

- `npm run typecheck`: passed, no errors.
- `npm run build`: passed. `index` is 205 kB gzip; the `launchlab` SDK chunk is 198 kB gzip and loads lazily.
- `npx vitest run`: **20 of 20 passed** across `tests/logic.test.ts` (8), `tests/ui.test.tsx` (10) and `tests/alloc.test.tsx` (2). Added in this revision: half-typed or invalid launch numbers (`x`, `-`, `1e-3`) leave the page in place and show field errors; planner and launch-form ids never collide; Tab and Shift+Tab stay inside the wallet sheet and Escape returns focus to Connect; watchlist records keep their network and get matching links; the allocation reads as pending until verified, completes with one approval, and stays completable after a declined approval.
- **Devnet check, no signing** (scratch script, public devnet RPC): `readDevAllocation` read a real SOL-quoted LaunchLab pool with nothing assigned as `pending` and a pool with a full vesting record as `allocated`. `allocateDeveloper` for a real pool creator built exactly one LaunchLab instruction with discriminator `81b2020dd9ace6da` (`create_vesting_account`), with owner and beneficiary set to the creator and a share equal to the full unassigned reserve. The signing callback inspected the message and threw before signing. A wallet that is not the creator is refused before any transaction is built.
- **Browser checks** in headless Chromium 1255 (Playwright, run outside the repository) against the built `dist/`: no horizontal scroll at 320, 390 or 1440 (the 320 header tools are 281px wide in a 288px content area). No page errors when Sold on the curve is `x`, Graduation target is `-` or Initial purchase is `1e-3`. Focus cycles × → Install Phantom → Install Solflare → × with `#root` inert. No duplicate ids after planner and launch-form errors. Devnet watchlist links carry `?cluster=devnet`.
- **Design probe** `taste.mjs`: 16 of 16 checks passed at 320, 390 and 1440. See `VALIDATION.md`.
- **Not performed**: no token was created, no allocation or trade was signed, and nothing was sent, because this environment has no wallet or funded keypair. Signing flows are tested up to the wallet boundary. Nothing was deployed to mainnet. WebKit and Firefox were not tested.

## Limits within the IMD Swarm environment

- **Hosting logos and metadata.** LaunchLab needs a hosted metadata URI (200 characters at most). A static site cannot hold pinning keys, so the form previews the logo and downloads `metadata.json`, and the creator hosts both (IPFS or Arweave) and pastes the link.
- **Creator, holder and treasury fee split.** This stays a planning setting. LaunchLab pays creator fees to the creator only, and holder or treasury distribution needs a platform config or a separate program.
- **DexScreener.** It indexes mainnet only, so devnet tokens show on-chain curve data and no DexScreener stats.
- **Ethereum NFT workers and buyback-and-burn.** These are kept as the proposed model and content. Ownership checks need the contract address, and burns need the treasury's contracts, neither of which was provided.
- **IMD Swarm API.** No public endpoint or credentials were provided, so the integration is the brief export and plan handoff.

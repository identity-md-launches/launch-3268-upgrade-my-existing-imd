# Validation and design review

## Commands and results (revision 2)

| Command | Result |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit`) | Passed, 0 errors |
| `npm run build` | Passed. `dist/index.html`, `assets/index-*.css` 20.3 kB, `assets/index-*.js` 663 kB (205 kB gzip), `assets/launchlab-*.js` 720 kB (198 kB gzip, loaded on first launch, trade or curve read) |
| `npx vitest run` | 20 of 20 passed (`tests/logic.test.ts` 8, `tests/ui.test.tsx` 10, `tests/alloc.test.tsx` 2) |
| Devnet allocation check (scratch vitest, public devnet RPC, no signing) | 10,788 LaunchLab pools listed. `readDevAllocation` returned `pending` for pool `E3yiu312…` (reserved 350,000,000 tokens, nothing assigned) and `allocated` for pool `13cx2dFq…` (record `67oWuEYB…` holds the full reserve). For creator `2Fp1H4Yv…`, `allocateDeveloper` built one LaunchLab instruction: discriminator `81b2020dd9ace6da` (`create_vesting_account`), with accounts owner = beneficiary = creator, pool, the vesting record PDA and System, and a share of 350,000,000,000,000 base units. The inspecting callback threw before any signature. A non-creator wallet was refused |
| Headless Chromium 1255 against `dist/` (Playwright outside the repository, with user-space copies of the missing system libraries) | Reproduced all six reported defects on the old export first, then confirmed each one fixed on the new export (details below) |
| `taste.mjs --out test/scratch/taste` | **16 of 16 passed** at 320, 390 and 1440: render, layout, targets, contrast, casing, tracking, eyebrows, type sizes, type faces, glyphs, slogans, repetition, copy budget, chrome, motion, share. The first run flagged `eyebrows` on the header Connect button, which sat 36px above the h1 at 390. The hero top padding on phones went from 24px to 32px, and the rerun passed |

On the 390 screenshot (`test/scratch/taste/shots/390.png`), the first screen shows the header (mark, Devnet, Connect, Menu), the headline, the one-line lede and the composer with "Build my plan".

## Reviewer findings, reproduced and fixed

| Finding | Before (old `dist/`) | After |
| --- | --- | --- |
| 1% never assigned to the developer (`src/lib/launchlab.ts`) | `createLaunch` only reserved `totalLockedAmount`. Nothing in `src/` called `createVesting` | `allocateDeveloper` (`launchpad.createVesting`) and `readDevAllocation` in `src/lib/launchlab.ts`, rendered by `src/components/DevAllocation.tsx` after the launch and in the trade panel for the creator. The review now says "reserved at creation, then assigned to your wallet by a second approval". The 1% counts as allocated only after the record is verified; otherwise the page shows "1% reserved; developer allocation pending" and the completion button |
| Numeric settings blank the page (`src/components/LaunchForm.tsx:30`) | `x`, `-` and `1e-3` threw a BigInt error and left `#root` with 0 children | `launchNumbers` runs only in review, after validation. `validateLaunch` accepts plain decimals only (`DECIMAL_RE`), and whole days for cliff and unlock. No page errors; `#root` keeps its 4 children |
| Header overflows at 320 (`src/styles.css`) | `scrollWidth` 329 at 320; tools 313px wide | Under 30rem `.header-tools` wraps inside 100% with `min-inline-size: 0`, and the network select is capped at 6.5rem. Tools are 281px on one row and `scrollWidth` is 320 |
| Watchlist loses the network (`src/components/Watchlist.tsx`) | Records were `{mint,label}` and Solscan had no cluster | Records are `{mint,label,cluster}`, set from a Network select (default: the header network; wrapped SOL: mainnet). Devnet records link to Solscan `?cluster=devnet`, hide DexScreener, Raydium and Market data, and explain why. Market data says "Solana mainnet market data" |
| Focus escapes the wallet sheet (`src/wallet/ConnectSheet.tsx`) | Tab went × → Phantom → Solflare → Menu (outside) | The sheet is portalled to `body`, `#root` is `inert` while it is open, and Tab and Shift+Tab wrap. Focus went × → Phantom → Solflare → × → Phantom; Escape returns focus to Connect |
| Duplicate planner and launch ids (`src/components/Composer.tsx`) | `name-error` ×2, and also `supply-hint` ×2 | Every planner error and hint id is prefixed `pro-`. No duplicate ids on the page |

## Better Interface review (six domains)

Coverage: source review against the core principles of all six domains, plus rendered checks in headless Chromium at 320, 390 and 1440 through the taste probe and scripted interactions. No real wallet extension was available.

| Domain | Finding | Fix or status |
| --- | --- | --- |
| Layout | `src/styles.css` (narrow-phone block): header tools overflowed at 320 | Fixed (above). Measured: no horizontal scroll at 320, 390 or 1440 |
| Layout | Header Connect pill 36px above the h1 at 390 read as a label | Hero top padding on phones is now `--space-8` |
| Accessibility | `src/wallet/ConnectSheet.tsx`: modal semantics without a focus trap | Fixed: trap, inert background, focus restored |
| Accessibility | `src/components/Composer.tsx:64-96`: ids shared with the launch form broke `aria-describedby` | Fixed with the `pro-` prefix |
| Accessibility | `src/components/DevAllocation.tsx`: allocation status changes after async work | Wrapper is `aria-live="polite"`, errors use `role="alert"`, and the status line pairs ✓ or ! with text |
| Writing | The review promised "vesting to your wallet" before anything was assigned | The copy now names both approvals. "Allocated" appears only after the record is verified |
| Writing | Devnet and mainnet links were mixed without a label | Each watchlist item names its network |
| Typography | New `.subhead` uses `--text-base`. The probe counts 4 or 5 sizes at 390 and 6 at 1440 | Pass |
| Colors | Allocation states reuse `--color-success` and `--color-warning` | The probe measured all text at 4.5:1 or better (3:1 for large text) |
| UI | New buttons use the existing `.button` states. The Network select reuses the field select style | Pass. The probe found 38 controls of at least 24px at 390 |

## Limitations

- No real wallet, signature or transaction: launching, allocating and trading are tested up to the wallet boundary only (unit tests with mocks, plus the devnet message inspection).
- Browser checks ran in Chromium only. WebKit, Firefox and real phones were not tested.
- The DexScreener iframe and API were blocked in the scripted browser runs, which allowed only local requests, so their rendering is unverified.

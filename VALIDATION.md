# Validation and design review

## Commands and results

| Command | Result |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit`) | Passed, 0 errors |
| `npm run build` | Passed. `dist/index.html`, `assets/index-*.css` 19.8 kB, `assets/index-*.js` 658 kB (204 kB gzip), `assets/launchlab-*.js` 719 kB (198 kB gzip, loaded on first launch, trade or curve read). `dist/` is 1.5 MB |
| `npx vitest run` | 14 of 14 passed (`tests/logic.test.ts` 8, `tests/ui.test.tsx` 6) |
| Devnet SDK probe (scratch script) | Raydium devnet program `DRay6fNd…`, config PDA `7ZR4zD7P…` found on chain and decoded, platform account found, `Raydium.load` succeeded |
| `taste.mjs --out test/scratch/taste` | **Did not run.** Playwright was installed outside the repository, but Chromium exits with `libatk-1.0.so.0: cannot open shared object file`. The other missing libraries are libatk-bridge, libXcomposite, libXdamage, libXfixes, libXrandr, libasound and libatspi. Installing them needs root |

There are no screenshots and no measured contrast ratios or overflow results. Every rendered check below is listed as unperformed.

## Better Interface review (six domains)

Coverage: source review against the core principles of accessibility, layout, writing, typography, colors and UI, plus the without-a-browser checks. No browser was available, so the rendered checks were not performed.

| Domain | Finding | Fix or status |
| --- | --- | --- |
| Layout | `src/components/Header.tsx:28`: at 320 and 390 wide, the brand, network select, Connect and Menu (about 400px) were wider than the screen, so the controls wrapped | Fixed: under 30rem the wordmark is visually hidden and the link keeps its `aria-label` (`src/styles.css`, last rule) |
| Layout | The first screen at 390 has the header with Connect, the h1 (4 words), one lede line and the composer with "Build my plan" | Kept. Confirmed from source; not confirmed on a screenshot |
| Accessibility | `src/wallet/ConnectSheet.tsx`: the dialog needed a name, focus on open and focus returned on close | Done: `aria-modal`, `aria-labelledby`, focus moves to ×, Escape, backdrop and × close it, and focus returns to Connect. **Remaining:** Tab is not trapped inside the sheet |
| Accessibility | Launch, trade and verify forms: errors were not linked to their fields | `Field.tsx` links each hint and error with `aria-describedby` and sets `aria-invalid`. The first invalid field gets focus (tested). Wallet errors use `role="alert"` and status messages use `role="status"` |
| Accessibility | `TradePanel.tsx` sparkline and `Watchlist.tsx` chart iframe had no text alternative | Fixed: the SVG has `role="img"` and a label giving the range; the iframe has a `title` |
| Writing | Wallet errors were raw SDK messages | `walletErrorText` (`src/lib/solana.ts`) turns rejection, insufficient SOL and expiry into one plain sentence |
| Writing | The original copy said "this page does not show prices" and "nothing is launched" | Updated to describe the real launch and trading. All other copy is kept |
| Typography | Six sizes from the original tokens; new components add none. No uppercase, tracking or eyebrows. Mono is used only for addresses | Pass (grep of `src/`) |
| Colors | The single lime accent is kept, with success, warning and error tokens reused for transaction states. Disabled controls use 60% opacity | Contrast not measured (no browser). The tokens are unchanged from the original site |
| UI | Every new control (rows, ×, select, file input) has rest, hover, pressed, focus-visible and disabled states. Rows are 48px and × is 32px. No `transition: all` | Pass (source) |

Unperformed rendered checks: horizontal overflow at 320, 390 and 1440, measured contrast, text overlap, reduced-motion behaviour, console and resource errors in a real browser, real wallet extension behaviour, and the DexScreener iframe rendering.

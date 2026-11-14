# IMD Launchpad design system

Taken from the final source: `src/styles.css` (the original site's stylesheet, kept as it was, plus a commented "Launchpad additions" block) and the components in `src/components` and `src/wallet`. The original look is unchanged: a dark, quiet, single-accent interface, with lime used only for the primary action and focus.

## Color tokens (`:root` in `src/styles.css`)

| Token | Value | Role |
| --- | --- | --- |
| `--gray-950` / `--color-bg` | `#0c0f14` | Page background, input fill |
| `--gray-900` / `--color-surface` | `#141922` | Cards, wallet sheet |
| `--gray-850` / `--color-surface-raised` | `#1c2230` | Buttons, wallet rows, selected segment |
| `--gray-700` / `--color-border` | `#2e3646` | Borders, dividers, progress track, pressed row |
| `--gray-400` / `--color-text-secondary` | `#a1abbc` | Secondary text, hints, hover border |
| `--gray-50` / `--color-text` | `#eef1f6` | Primary text |
| `--lime-400` / `--color-accent`, `--color-focus` | `#b8f25c` | Primary buttons, links, focus ring, sparkline |
| `--lime-300` / `--color-accent-hover` | `#cdf78a` | Primary hover |
| `--color-on-accent` | `#0c0f14` | Text on lime |
| `--coral-300` / `--color-error` | `#ff9e92` | Field errors, failed transactions |
| `--amber-300` / `--color-warning` | `#f5c86b` | Warnings, "changes requested" |
| `--teal-300` / `--color-success` | `#7fd9c0` | Approved tasks, confirmed transactions, progress fill |

`color-scheme: dark`. The sheet backdrop is `rgb(0 0 0 / 0.6)`. Under `forced-colors`, buttons and the selected tab get a `ButtonText` border.

## Typography

- Sans: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Mono (`ui-monospace, "SF Mono", …`) is used only for mint addresses, signatures and the metadata link (`.mono-input`, `.mint`).
- Six sizes, used throughout: `--text-sm` .875rem, `--text-base` 1rem, `--text-lg` 1.125rem, `--text-xl` 1.5rem, `--text-2xl` 2rem, `--text-display` 2.5rem (3.5rem from 60rem).
- h1 is display size, line-height 1.05, letter-spacing -0.035em. h2 is xl (2xl from 60rem), h3 is lg/600. Body line-height is 1.55. Headings use `text-wrap: balance` and paragraphs use `pretty`.
- Weights 400, 600, 700. Numbers use `.num` (tabular figures).
- No uppercase labels, no tracked small caps, no eyebrows.

## Spacing, radius, layout

- Spacing scale: `--space-1` .25rem, `-2` .5rem, `-3` .75rem, `-4` 1rem, `-6` 1.5rem, `-8` 2rem, `-12` 3rem, `-20` 5rem.
- Radius: `--radius-control` 8px (inputs, buttons, rows), `--radius-card` 14px (cards, sheet).
- Content width is `--wrap` 72rem. The gutter is 1rem, 1.5rem from 40rem and 2rem from 60rem.
- Motion: `--ease-out` cubic-bezier(.2,0,0,1), 150ms, on named properties only. A button press scales to .96, which is removed under `prefers-reduced-motion`. Nothing animates endlessly.

## Components

| Component | Source | Notes |
| --- | --- | --- |
| Header | `Header.tsx`, `.header-row`, `.header-tools` | Brand, network select (Devnet; Mainnet shows "(off)" until the owner enables it), the Connect control, and a Menu toggle under 60rem |
| Connect control and sheet | `wallet/ConnectSheet.tsx`, `.sheet-bg`, `.sheet`, `.row`, `.ic`, `.x` | Lists installed Solana wallets by their own name and icon (Wallet Standard). On a phone with none installed it shows "Open in Phantom" and "Open in Solflare"; on a desktop with none it shows install links. Rows are 48px; the × is 32px. Closes on backdrop, Escape or ×. When connected it shows the short address and Disconnect |
| Composer | `Composer.tsx`, `.composer`, `.segmented` | Idea textarea, Easy/Pro segmented control, primary "Build my plan" |
| Studio | `Studio.tsx`, `.studio`, `.tabs`, `.task`, `.facts`, `.swarm-bar` | Tabs with arrow, Home and End keys. Approve or request changes. "Launch this token" hands the plan to the form. Copy Swarm brief, download plan |
| Launch form | `LaunchForm.tsx`, `.launch`, `.form-group`, `.logo-row` | Three fieldsets (Token, Metadata, Launch settings). The review screen lists the exact integers before signing, then shows the verified result |
| Field | `Field.tsx`, `.field`, `.hint`, `.error` | Label, input, hint and error tied together with `aria-describedby`. The first invalid field gets focus |
| Trade panel | `TradePanel.tsx`, `.trade-grid`, `.stats`, `.spark`, `.progress` | Bonding-curve stats read from chain, graduation progress, a session price sparkline, and a Buy/Sell form |
| Market card | `Watchlist.tsx` `MarketCard`, `.market`, `.chart` | DexScreener price, liquidity, 24h volume and market cap, a live chart iframe on demand, and the pair link |
| Watchlist | `Watchlist.tsx`, `.watch-list`, `.watch-item` | Saved in localStorage. Market data, trade, DexScreener, Raydium and Solscan links, remove |
| Transaction list and verifier | `TxList`, `TxVerify`, `.tx-list` | Status, slot, fee, Solscan link and the programs called |
| Revenue table | `Revenue.tsx`, `.split-table` | The proposed split, including the 10% IMD buyback and burn |
| Buttons | `.button`, `-primary`, `-quiet`, `-small`, `.link-button` | 44px tall (36px small). Hover border, pressed scale, 60% opacity when disabled |

States: every control has a `:focus-visible` 2px lime ring with a 2px offset. Hover only applies under `(hover: hover)`. Fields show `aria-invalid` with a coral border.

## Responsive behavior

- Under 30rem: the brand shows only its mark (the link keeps its accessible name) so the network, Connect and Menu controls fit in one row at 320 and 390. The wallet icon in the connected chip is hidden.
- Under 40rem: the wallet sheet is a bottom sheet. From 40rem it is a centered dialog, at most 420px wide.
- From 30rem: `.grid-2` form grids become two columns.
- From 48rem: the trade panel splits 7fr/5fr, watch and verify forms put the button beside the input, and task rows get a 15rem side column.
- From 60rem: the nav is inline and the Menu toggle is hidden. The hero becomes 5fr/6fr with the composer beside the headline. `.split` sections become 5fr/7fr (the launch form is 7fr/5fr with the steps beside it). Stats show four across.
- At 390 wide, the first screen shows the header with Connect, the headline, one line saying what this is, and the idea composer with "Build my plan".
